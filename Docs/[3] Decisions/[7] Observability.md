# Decision — Observability

**Status:** LOCKED + runtime implemented (Pino app/access logs; health probes incl. Redis)  
**Date:** 2026-09-20  
**Applies to:** `backend/` ops, Docker / VPS; not client apps as the log authority

---

## Core idea

These are **operational / observability** concerns, **not business data**.

Do **not** build CRUD screens and PostgreSQL tables for high-volume logs, host metrics, or infra alerts.

Analogy: site **monitoring, inspection, and warning systems** around the building — not part of the building’s business rooms.

| Belongs in PostgreSQL (business / curated) | Belongs in logging / monitoring infra |
| --- | --- |
| `users`, `projects`, `expenses`, … | Application logs (stdout) |
| `activity_logs` (audit inbox) | Request / access logs (stdout) |
| `error_logs` (SUPER inbox, unexpected/5xx) | CPU / RAM / disk, DB/Redis health |
| | Alerts to humans (email/Slack/…) |

**Exception already locked:** curated SUPER inboxes (`error_logs`, `activity_logs`) are OK — low volume, actionable in-app. That is **not** a pattern for every request or every `info` line.

---

## 1. Application logs

Messages the backend writes while running, e.g.:

```text
INFO  Server started on port 3000
INFO  User logged in successfully
WARN  Payment provider took 3.2 seconds
ERROR Failed to send email
```

Write them to **stdout / stderr** via a structured logger — not into PostgreSQL.

```text
Backend
   ↓
Pino logger
   ↓
stdout / stderr
   ↓
Docker logs
```

Inspect:

```bash
docker logs backend
docker logs -f backend
```

### Why Pino?

Pino produces structured JSON, e.g.:

```json
{
  "level": "info",
  "msg": "User logged in",
  "userId": "123",
  "requestId": "abc-456"
}
```

That stays searchable if you later attach a log platform.

**Never log:** passwords, JWTs, refresh tokens, payment secrets, full PII dumps.

**Locked choice:** **Pino** for application logging (`backend/src/logging/`, `LOG_LEVEL` env).

---

## 2. Request logs (HTTP access)

About **HTTP requests** into the API. Example call:

```http
POST /api/v1/projects
```

Middleware records something like:

```text
POST /api/v1/projects
Status: 201
Duration: 84ms
User: 123
Request ID: abc-456
```

Flow:

```text
Client
   ↓
POST /api/v1/projects
   ↓
Request logging middleware
   ↓
Controller → Service → Database
```

Capture:

- method (`GET` / `POST` / …)
- path (`/api/v1/projects`)
- status (`200`, `404`, `500`)
- duration (`84ms`)
- `userId` if authenticated
- `requestId` (already set by `requestContext` / `x-request-id`)

### Why not save every request to PostgreSQL?

At **100,000 requests/day** that is **100,000 INSERTs** just to record “someone hit GET /projects”. Unnecessary DB load. Keep access logs in Docker / server logging.

**Locked choice:** access-log middleware → same Pino / stdout stream. Skip noisy paths if needed (e.g. health checks).

---

## 3. DB / Redis monitoring

Not “what business data exists?” — **“is infrastructure healthy?”**

PostgreSQL examples: up/down, connections, slow queries, CPU/disk (via host/provider).  
Redis examples (when wired): up/down, memory, clients, hit rate.

Do **not** invent app tables like `database_monitoring` / `redis_monitoring`.

```text
                ┌── PostgreSQL
Backend ────────┤
                └── Redis (when present)

Monitoring / provider tools
    ↓
health & performance
```

App-side health probes:

- `GET /api/v1/health`
- `GET /api/v1/health/db`
- `GET /api/v1/health/redis` (requires `REDIS_URL`)

Deep Postgres/Redis performance stays on the **VPS / provider panel** — not app CRUD tables.

---

## 4. Alerts

Monitoring sees a problem; an **alert** notifies a human.

Examples:

- PostgreSQL down → “Database unavailable”
- VPS disk 95% / CPU 98% → “Host critically high”

Delivery later: email, Slack, Discord, Telegram, or a monitoring SaaS.

Do **not** require an `alerts` CRUD table in the app for infrastructure alerts.

**Locked for now:** use **VPS provider panel / alerts** for host metrics; app health endpoints for deploy probes. Richer alert channels = later.

---

## Architecture split

```text
                    YOUR APPLICATION
                           │
              ┌────────────┴────────────┐
              │                         │
          Business                  Operations
             │                         │
        PostgreSQL                  Pino
             │                         │
     users/projects/etc.          stdout/stderr
     activity_logs / error_logs        │
                                     Docker
                                       │
                                  Server logs
                                       │
                              Monitoring / Alerts
```

You do **not** build a full logging/monitoring product inside the civil app.

---

## Bedrock implementation target (simple)

**Backend**

- [x] Pino application logger (`backend/src/logging/`)
- [x] Request / access logging middleware (`pino-http`, skips `/api/v1/health*`)
- [x] Health endpoints (`/api/v1/health`, `/db`, `/redis`)
- [x] Curated `error_logs` + `activity_logs` (not general log storage)
- [x] No secrets in logs (Pino `redact` paths + serializers without bodies)

**Docker / VPS**

- [x] Host metrics via provider panel
- [x] Docker logs as the log sink (API logs JSON to stdout; `docker logs` / Compose)
- [x] Postgres health via `/api/v1/health/db` + provider tooling for deeper metrics
- [x] Redis monitoring via `/api/v1/health/redis` + provider tooling for deeper metrics

**Later**

- Centralized log shipping
- Slack/email (or similar) alerts
- Richer metrics

---

## Related

- [Bedrock Checklist](../[1]%20Main%20App/[2]%20Bedrock%20Checklist.md) §23
- [Security Foundation](./[6]%20Security%20Foundation.md) — no sensitive data in logs
- [Docker & Infrastructure](./[4]%20Docker%20%26%20Infrastructure.md)
