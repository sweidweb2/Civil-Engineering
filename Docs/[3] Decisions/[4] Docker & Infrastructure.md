# Decision — Docker & Infrastructure

**Status:** SUPERSEDED — Docker **removed** from the app  
**Original date:** 2026-09-20  
**Superseded:** 2026-11-14  
**Applies to:** monorepo root, `civil-web/`, `backend/`  
**Source of truth for stack:** `Docs/[1] Main App/[1] Tech Stack.md`  
**Cursor rule:** `.cursor/rules/docker.mdc` (superseded)

> The repo no longer contains Dockerfiles, `.dockerignore` files, or any Docker Compose files (root, staging, production, or `backend/docker-compose.test.yml`). Docker is **not** required for local development or tests, and Hostinger VPS + Docker is **no longer the assumed deploy path**.

---

## Current state

| Item                                                          | Now                                                           |
| ------------------------------------------------------------- | ------------------------------------------------------------- |
| `civil-web/Dockerfile`, `backend/Dockerfile`, `.dockerignore` | **Removed**                                                   |
| `docker-compose*.yml` (root)                                  | **Removed**                                                   |
| `backend/docker-compose.test.yml`                             | **Removed** — tests use **embedded-postgres**                 |
| Database                                                      | **Supabase Postgres** (Prisma + Express)                      |
| Redis                                                         | **Removed** — see [Redis](./[8]%20Redis.md)                   |
| Local dev                                                     | `npm` in `backend/` and `civil-web/` — no Docker              |
| Mobile                                                        | No Dockerfile (Play / App Store, unchanged)                   |
| `infrastructure/`                                             | Not present; create only when real Nginx/deploy config exists |

---

## Production deployment — TBD

Not locked. Hostinger VPS + Docker + Nginx was the earlier plan and is **not** the current baseline. Decide host, process model (e.g. Node process manager, PaaS, or containers), TLS/reverse proxy, and migration release step in a **new decision** when deploying.

Principles that still apply regardless of host:

- No secrets in git; inject env at runtime.
- Prisma Migrate only; run migrations as an explicit release step.
- Log to stdout/stderr.
- Do not expose the database publicly beyond what Supabase requires; the API is the only client of Postgres.
- Keep the modular monolith (one API, no microservices).

---

## Checklist mapping

See `Docs/[1] Main App/[2] Bedrock Checklist.md` §20 and §26.
