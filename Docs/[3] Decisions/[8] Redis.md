# Decision — Redis / Cache / Queue

**Status:** SUPERSEDED — Redis **removed** from the app  
**Original date:** 2026-09-20  
**Superseded:** 2026-11-14  
**Applies to:** `backend/` only

> Redis (`ioredis`), BullMQ, Redis cache helpers, and the `/api/v1/health/redis` endpoint no longer exist. Do not reintroduce them without a new decision.

---

## Current state

| Concern                                         | Now                                                                                                                     |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Redis / `ioredis`                               | **None** — dependency and code deleted                                                                                  |
| Cache helpers (`civil:*` keys, `redis.keys.ts`) | **Removed**                                                                                                             |
| Rate limiting                                   | **In-process memory** via `express-rate-limit` (per API instance)                                                       |
| Idempotency keys (create endpoints)             | **In-process memory**, bounded, 24h (per API instance) — see [14] Mobile Offline Read Cache                             |
| Caching                                         | Not server-side by default. Use **client-side** caching, **CDN** (static assets), and **presigned URLs** (R2) as needed |
| Job queue (BullMQ)                              | **None** — jobs stay **synchronous** (`backend/src/jobs/` wrappers run inline)                                          |
| Health                                          | `/api/v1/health/redis` **removed** (DB health only)                                                                     |
| Source of truth                                 | **PostgreSQL (Supabase)**                                                                                               |

Web and mobile are unchanged: REST `/api/v1` only.

```text
Web / Mobile
    ↓  REST only
Express API (in-process rate limit)
    ↓
PostgreSQL (Supabase) · Cloudflare R2
```

---

## Consequences

- **Rate limits are per process.** With multiple API instances limits are not shared; acceptable for the current single-instance setup.
- **No retry/backoff queue.** Sync jobs must fail loudly (log + error), not silently drop. Retry in-request or via client if needed.
- **No server cache invalidation to maintain.** If hot reads become a measured problem, prefer query/index fixes first.

## If caching / queues are needed later (TBD)

Not locked. Requires a new decision doc before adding any shared store (Redis or otherwise) or queue library. Keep Postgres as source of truth.

---

## Related

- [Tech Stack](../[1]%20Main%20App/[1]%20Tech%20Stack.md)
- [Docker & Infrastructure](./[4]%20Docker%20%26%20Infrastructure.md) — also superseded
- [Observability](./[7]%20Observability.md)
- [Mobile Offline Read Cache](./[14]%20Mobile%20Offline%20Read%20Cache.md) — in-process idempotency store
