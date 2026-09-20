# Decision — Redis / Cache / Queue

**Status:** LOCKED (client + Compose + retry/failed-job policy); BullMQ package/workers when first real async job needs them  
**Date:** 2026-09-20  
**Applies to:** `backend/` only

---

## Who uses Redis?

| App | Talks to Redis? |
| --- | --- |
| **`backend/`** | **Yes** — sole Redis client (cache / queue / short-lived ops data) |
| **`civil-web/`** | **No** — REST `/api/v1` only |
| **`civil-mobile/`** | **No** — REST `/api/v1` only |

Web and mobile **benefit indirectly** when the API caches or queues work. They never open a Redis connection.

```text
Web / Mobile
    ↓  REST only
Express API  ←→  Redis (cache / queue)
    ↓
PostgreSQL (source of truth)
```

**Rule locked:** Redis is not miscellaneous storage and not a second database.

---

## Role

| Use | Notes |
| --- | --- |
| **Cache** | Hot, repeatable reads with TTL + invalidation |
| **Queue** | Background jobs via **BullMQ** when needed (not every notify must be queued yet) |
| **Other** | Rate-limit counters / short-lived metadata only when justified |

---

## Libraries

| Concern | Choice |
| --- | --- |
| Redis client | **`ioredis`** |
| Job queue (when needed) | **BullMQ** (Redis-backed) |
| Local / Compose image | **`redis:7-alpine`** |

---

## Cache keys

Prefix everything with `civil:`.

| Pattern | Example |
| --- | --- |
| Entity | `civil:project:{id}` |
| List (versioned) | `civil:projects:list:v{n}:p{page}:l{limit}` |
| User-scoped | `civil:user:{userId}:…` |
| Rate / counter | `civil:rl:{scope}:{id}` |

Helpers: `backend/src/redis/redis.keys.ts`

---

## TTL / invalidation / do-not-cache

| Policy | Rule |
| --- | --- |
| TTL | **Always** set TTL on cache keys (default helpers use seconds) |
| Typical TTL | Short hot reads: **60s–300s**; tune per use case |
| Invalidation | On write: `del` entity key and/or bump list version |
| Do not cache | Passwords/tokens as SoR; money/inventory without DB authority; unbounded dumps; anything that must be correct on every read without a clear invalidation plan |

Postgres remains source of truth.

---

## Jobs / workers

| Item | Decision |
| --- | --- |
| Layout | `backend/src/jobs/` — enqueue wrappers; workers when BullMQ is wired |
| Seam today | `enqueueNotifyUser` / `enqueueDeleteStorageObject` may still run sync until a queue is justified |
| Defaults module | `backend/src/jobs/workers/job.defaults.ts` — shared options for first BullMQ Queue |
| Retry / backoff | **5 attempts** (1 try + 4 retries); **exponential** backoff, initial delay **2s** (2→4→8→16s) |
| Failed jobs | Keep in BullMQ **failed set** (`removeOnFail: false`); **log error** with job name, id, idempotencyKey, reason — no silent drop; manual redrive / board later |
| Completed trim | `removeOnComplete: { count: 1000 }` — short debug retention only |
| Idempotency | Job payloads + idempotency keys where side effects are unsafe to repeat |
| Runtime | **Deferred** — do not install/run BullMQ until the first durable async job needs it |
| Monitoring | Redis `PING` via health; BullMQ metrics/UI later |

---

## Compose / env

| Env | Redis URL |
| --- | --- |
| Local npm API | `REDIS_URL=redis://127.0.0.1:6379` (Compose publishes port) |
| API in Compose | `REDIS_URL=redis://redis:6379` (service DNS) |
| Test | Optional — omit `REDIS_URL` → cache helpers no-op / skip |

Do not publish Redis to the public internet — internal Docker network (+ localhost bind for local npm).

---

## Related

- [Bedrock Checklist](../[1]%20Main%20App/[2]%20Bedrock%20Checklist.md) §15
- [Docker & Infrastructure](./[4]%20Docker%20%26%20Infrastructure.md)
- [Observability](./[7]%20Observability.md) — Redis monitoring via infra, not CRUD tables
