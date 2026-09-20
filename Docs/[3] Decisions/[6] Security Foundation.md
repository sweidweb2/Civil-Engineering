# Decision — Security Foundation

**Status:** LOCKED (runtime middleware + production review checklist)  
**Date:** 2026-09-20  
**Applies to:** `backend/` (API), edge Nginx (TLS), `civil-web/` / `civil-mobile/` (token storage only)

---

## HTTPS / TLS

| Layer            | Responsibility                                                                        |
| ---------------- | ------------------------------------------------------------------------------------- |
| **Nginx (edge)** | Sole public HTTP/HTTPS entry; terminate TLS; redirect HTTP → HTTPS in production      |
| **Express**      | Internal HTTP only (Docker network); never expose TLS-terminated public port directly |
| **Clients**      | Call `https://` API origins in staging/production; CORS allowlist uses those origins  |

`TRUST_PROXY=true` in staging/production so Express trusts `X-Forwarded-*` from Nginx (rate-limit IP, secure cookies later if used).

TLS cert issuance / domain wiring remains infra TBD (`infrastructure/nginx/` when real config exists) — the **termination point is locked**: Nginx, not Express.

---

## Express security middleware (runtime)

| Control          | Implementation                                                               |
| ---------------- | ---------------------------------------------------------------------------- |
| Security headers | `helmet()` in `createApp`                                                    |
| CORS             | Allowlist from `CORS_ORIGINS` (no `*`)                                       |
| JSON body size   | `express.json({ limit: JSON_BODY_LIMIT })` default `100kb`                   |
| API rate limit   | `express-rate-limit` — `RATE_LIMIT_*` (default 200 / 15m); skipped in `test` |
| Auth rate limit  | Stricter on `/api/v1/auth/*` — `AUTH_RATE_LIMIT_*` (default 20 / 15m)        |
| Password hashing | `bcrypt` cost **12** (`auth.tokens.ts`)                                      |
| Input validation | Zod via `validate` middleware                                                |
| Authn / authz    | JWT middleware + **role gates** + **service ownership** (no permission-matrix RBAC) |
| SQL              | Prisma only (parameterized)                                                  |

429 responses use `{ code: "RATE_LIMITED", message: "Too many requests" }`.

---

## Authorization model (locked — not RBAC permissions)

This app uses **roles + ownership**, not a permission-matrix RBAC (`resource:action` ACL).

| Layer | Mechanism | Purpose |
| --- | --- | --- |
| **Authenticate** | `authenticate` Bearer JWT → `req.user` | Who is calling |
| **Role gate** | `authorize(...roles)` on routes | Vertical: e.g. SUPER-only logs, ADMIN list users |
| **Ownership** | `assertOwner` / `assertOwnerOrAdmin` / `assertSelfOrAdmin` in services | Horizontal: own resource vs another user’s |
| **Admin rules** | `ADMIN_ROLES` = `SUPER` \| `ADMIN` | Admins bypass ownership where used; SUPER-only for platform ops (error/activity logs). Role changes / user deactivate are admin-only |
| **Frontend** | `RequireRole` / `Can` / `usePermissions` | UX only — never the security boundary |

Helpers live in `backend/src/authz/`. Domain modules call ownership checks in **services** after loading the resource (e.g. `projects.assertAccessible`).

---

## Token / secret storage

| Client  | Storage                                                            |
| ------- | ------------------------------------------------------------------ |
| Web     | Zustand persist → `localStorage` (`civil-web-auth`) — session only |
| Mobile  | Zustand persist → SecureStore (`civil-mobile-auth`)                |
| Backend | Env / host secrets — never commit real production values           |

---

## Dependency audit process

1. **Local / PR:** `npm run audit:deps` in each app — surfaces **high+** (`npm audit --audit-level=high`).
2. **CI gate:** `npm run audit:deps:ci` — fails the job on **critical** vulnerabilities.
3. **CI report:** high-level audit also runs with `continue-on-error` so PRs still see highs without blocking on known upstream noise.
4. **Remediation:** Prefer `npm audit fix` without `--force`. Document accepted risks in the PR when upstream has no safe fix yet.
5. **Cadence:** Every PR that touches lockfiles; re-check when upgrading Node/major deps.

### Accepted risk (temporary)

Prisma CLI currently pulls high advisories in `deepmerge-ts` / `mysql2` (unused MySQL path; we use PostgreSQL). Do **not** `npm audit fix --force` (downgrades Prisma). Revisit when Prisma ships a fixed release; then promote the CI gate to hard-fail on high.

---

## Production security config review (pre-deploy)

Complete before promoting to staging/production:

- [ ] `NODE_ENV=production` (or `staging`)
- [ ] `CORS_ORIGINS` is an explicit `https://` allowlist (no `*`, no localhost)
- [ ] `TRUST_PROXY=true` behind Nginx
- [ ] `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` are unique, long, not placeholders
- [ ] `JWT_*_EXPIRES_IN` match product policy (defaults `15m` / `7d`)
- [ ] `RATE_LIMIT_*` and `AUTH_RATE_LIMIT_*` set for expected traffic
- [ ] `JSON_BODY_LIMIT` appropriate (default `100kb`; raise only with justification)
- [ ] `LOG_LEVEL` is not `debug` in production; no tokens/passwords in logs
- [ ] `DATABASE_URL` and storage secrets injected at runtime (Compose/host), not committed
- [ ] Edge Nginx terminates HTTPS; API not publicly reachable except via `/api`
- [ ] `npm run audit:deps` clean (or documented accepted risks)

Env templates: `backend/.env.example`, `.env.staging`, `.env.production`.
