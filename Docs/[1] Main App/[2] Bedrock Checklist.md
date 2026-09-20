# Project Bedrock Checklist

Track foundation work only. Check items when done. Do not expand into essays here.

**Last reviewed:** 2026-09-18 — progress marked against the current repo (docs/rules vs implemented code).

---

## 1. Project / Repository Foundation

- [x] Monorepo folders exist: `civil-web/`, `civil-mobile/`, `backend/`
- [x] Root `README.md`
- [x] Root `.gitignore`
- [x] Root `.editorconfig`
- [x] Formatting / linting conventions decided and applied
- [x] Git branch strategy defined
- [x] Commit convention defined
- [x] Basic contribution / development rules defined
- [x] Project naming conventions defined

> Formatting/linting **decided** in `Docs/[3] Decisions/[1] Formatting & Linting.md` (Prettier + ESLint + strict TS + Husky/lint-staged). Root install/config still TODO.  
> Branch strategy **locked** in `Docs/[3] Decisions/[2] Git Branch Strategy.md`: **`play`** (daily) → **`dev`** (staging) → **`main`** (production). Same CI on `dev` and `main`. Remote protection + auto-deploy still TODO.

---

## 2. Architecture Foundation

- [x] Overall architecture locked: monolith
- [x] Backend architecture locked: layered
- [x] Backend organization locked: DDD modules
- [x] Frontend organization locked: feature-based
- [x] Dependency direction defined
- [x] Separation of responsibilities defined
- [x] Module boundaries defined
- [x] Shared-code rules defined
- [x] Cross-module communication rules defined
- [x] Circular-dependency rules defined
- [x] KISS / SRP / no-overengineering rules locked

---

## 3. Backend Foundation

- [x] Express + TypeScript bootstrapped
- [x] Application bootstrap / HTTP server setup
- [x] Folder layout: routes → controllers → services → repositories
- [x] DTOs / Zod schemas placement defined
- [x] Domain models / Prisma models placement defined
- [x] Middleware folder (auth, authz, request context)
- [x] Central error handling
- [ ] Logging setup
- [x] Config module
- [x] API response conventions defined
- [x] Per-layer allowed / not-allowed rules written

> Note: App factory + `server.ts`, `/api/v1` + health sample module (full layers), config, middleware stubs, typed `AppError` + error middleware. Remaining in §3: logging setup.

---

## 4. DDD / Domain Foundation

- [x] Initial domains identified (auth, users, projects, workers, materials, expenses, …)
- [x] `backend/src/modules/<domain>/` structure created for first domains
- [x] Per domain: responsibility defined
- [x] Per domain: entities defined
- [x] Per domain: value objects defined (if needed)
- [x] Per domain: use cases defined
- [x] Per domain: repository defined
- [x] Per domain: controller / service defined
- [x] Per domain: validation schemas defined
- [x] Per domain: relationships defined
- [x] Per domain: external access rules defined
- [x] Rule locked: domain owns its business logic and data access

> Note: Domains are mostly API stubs. **User + Profile** Prisma models are live for auth. Other domains still provisional until their tables land.

---

## 5. Database Foundation

### PostgreSQL

- [x] DB architecture decided
- [x] Table / column naming conventions
- [x] Primary keys / foreign keys conventions
- [x] Relationships conventions
- [x] Unique constraints / indexes conventions
- [x] Nullability / timestamps conventions
- [ ] Soft-delete / audit fields (if used)
- [x] Enums / transactions conventions

### Prisma

- [x] Prisma setup
- [x] Schema organization
- [x] Prisma Client usage rules (repository-only)
- [x] Local / staging / prod DB envs configured
- [x] Migration process defined
- [x] Seed process defined (if needed)
- [x] Rule locked: migrations are versioned; no manual prod replay as source of truth

> Note: Prisma 7 + `@prisma/adapter-pg`. Models: `User`, `Profile` (+ `Role`, `UserStatus`). Migration `users_and_profiles` applied. Other domains TBD.

---

## 6. API Foundation

- [x] REST base path: `/api/v1`
- [x] URL / resource naming convention
- [x] HTTP methods convention
- [x] Status codes convention
- [x] Request / response structure convention
- [x] Error response structure convention
- [x] Filtering convention
- [x] Pagination convention
- [x] Sorting / searching convention
- [x] Nested resource rules
- [x] Authn / authz on API defined
- [x] API docs approach chosen — **OpenAPI 3.x** (spec is the contract; UI viewer TBD e.g. Swagger UI / Scalar)

> Spec lives under `Docs/api/` (and/or generated from backend later). Swagger UI is a viewer, not a competing standard.

---

## 7. Authentication & Authorization

### Authentication

- [x] JWT access tokens
- [x] Refresh tokens
- [ ] Token rotation / revocation (client logout only for now; server revocation TBD)
- [x] Token expiration values set
- [x] Password hashing (bcrypt)
- [x] Login / logout
- [ ] Password reset (if in scope)
- [ ] Email verification (if in scope)
- [x] Session / account management rules (JWT session; public register → CLIENT)

### Authorization

- [x] Roles model (`SUPER` `ADMIN` `PROVIDER` `WORKER` `MANAGER` `CLIENT`) — role gates only; **no** permission-matrix RBAC
- [x] Resource ownership checks (`backend/src/authz/` — `assertOwner` / `assertOwnerOrAdmin` / `assertSelfOrAdmin`; projects `assertAccessible`)
- [x] Admin rules (`ADMIN_ROLES` = SUPER+ADMIN ownership bypass; SUPER-only logs; admin-only user list/create/deactivate)
- [x] API auth middleware (`authenticate` verifies Bearer access JWT; `authorize(...roles)` for vertical gates)
- [x] Frontend permission handling approach (`RequireAuth` / `RequireRole` / `Can` / `usePermissions` — UX only)

> Note: Authz is **role + ownership**, not RBAC permissions. `users` + `profiles` migrated. Auth routes: `/api/v1/auth/register|login|refresh|logout`. Web + mobile show login/register first, then home.

---

## 8. Validation & Error System

### Validation (Zod)

- [x] Body validation
- [x] Query validation
- [x] Params validation
- [x] Backend validation mandatory
- [x] Frontend validation for UX only
- [x] Shared validation strategy documented

> Note: `validate({ body | query | params })` middleware on domain routes. Shared `paginationQuerySchema` for list queries. Invalid input → `400 VALIDATION_ERROR`.

### Errors

- [x] Custom error types / classes
- [x] Stable error codes
- [x] HTTP status mapping
- [x] Central error middleware
- [x] Validation / auth / authz / not-found / business / internal cases covered
- [x] Production error sanitization (no stacks to clients)

---

## 9. Frontend Foundation (React Web)

- [x] React + TypeScript + Vite ready
- [x] Routing setup
- [x] Feature-based `src/features/` structure
- [x] Shared `components/`
- [x] Shared `hooks/` (`useRemoteData`, `usePermissions`, `useMediaQuery`, `useDocumentTitle`)
- [x] `services/` API layer
- [x] Client state approach (Zustand)
- [x] Server-state approach decided — fetch via `services/` + local/`useRemoteData` per feature; Zustand is not an API cache; dedicated cache lib (e.g. TanStack Query) deferred until needed
- [x] Forms + Zod validation approach — feature `*.schema.ts` + `parseForm` + Field primitives (no react-hook-form); frontend Zod = UX only
- [x] Loading / error UI patterns
  - [x] Inline loading / error states per feature (not one global spinner) — `AsyncState` / `InlineSpinner`
  - [x] Toast for non-blocking API / mutation failures — Sonner + `toastApiError`
  - [x] Customized error pages (web-only): 404, unexpected/500, React error-boundary fallback
  - [x] Rule locked: full-page error routes are for `civil-web` only
- [x] Auth + UI permission handling — `RequireAuth` / `GuestOnly` / `RequireRole` / `Can` + `usePermissions` (UX only; backend authz is authority)

> Note: Error routes (`*` → 404, `/500`, `ErrorBoundary`) live in `civil-web` only. Mobile uses inline / toast / navigate instead.

---

## 10. Mobile Foundation (React Native)

- [x] React Native + TypeScript + Expo ready
- [x] Navigation setup
- [x] Feature-based `src/features/` structure
- [x] Screens / components / hooks layout
- [x] `services/` API layer
- [x] Secure token storage (`expo-secure-store`)
- [x] Client state approach (Zustand)
- [x] Forms + validation approach — feature `*.schema.ts` + `parseForm` + `FormField` (frontend Zod = UX only)
- [x] Loading / error handling
  - [x] Inline loading / error + retry on screens (failed fetches) — `AsyncState` + `useRemoteData`
  - [x] Toast for quick / non-blocking API failures — `useToastApiError`
  - [x] Alert for blocking failures when confirmation is required — `showBlockingAlert` / `showApiAlert`
  - [x] Navigate back / to login for missing resource or auth failures — `handleAuthFailure` (401/403 → logout + `/login`)
  - [x] Optional single global crash fallback screen (not a set of error routes) — `ErrorBoundary`
  - [x] Rule locked: no dedicated 404/500-style error pages on mobile — toast / inline / navigate instead
- [x] Deep linking (if in scope) — Expo Router + `scheme: civilmobile` in `app.json`; custom link map TBD with features
- [ ] Notifications (if in scope) — deferred; not in bedrock scope yet
- [x] Dev / preview / prod env config

> Note: Routes under `src/app/` stay thin; screens live in `src/features/<feature>/`. No mobile error-page catalog (web-only).

---

## 11. Global Design System / Theme

### Web — `civil-web/src/theme/`

- [x] `colors.ts` (incl. light / dark)
- [x] `spacing.ts`
- [x] `typography.ts`
- [x] `radius.ts`
- [x] `shadows.ts`
- [x] `sizes.ts`
- [x] `breakpoints.ts`
- [x] `zIndex.ts`
- [x] `index.ts` entry exports

### Mobile — `civil-mobile/src/theme/`

- [x] `colors.ts` (incl. light / dark)
- [x] `spacing.ts`
- [x] `typography.ts`
- [x] `radius.ts`
- [x] `shadows.ts`
- [x] `sizes.ts`
- [x] `index.ts` entry exports

### Tokens to fill

- [x] Brand colors (`primary` `#2FA084`, `secondary` `#6FCF97` — light mode, web + mobile)
- [x] Semantic colors (success / warning / error / info / disabled) — light mode, web + mobile
- [x] Background / surface / text / border (light mode, web + mobile) — surface `#FFFFFF`, muted text + softer border
- [x] Spacing scale — 4px base (`none`…`3xl`)
- [x] Typography + semantic text styles — Geist (web) / System (mobile); h1–h3, body, caption, label, button
- [x] Radius scale — `none`…`full`
- [x] Shadow scale — `none`…`xl` (CSS web / RN elevation mobile)
- [x] Global sizes — header, controls, icons, avatars, content widths
- [x] Web breakpoints — `sm` 640 → `2xl` 1536
- [x] Web z-index layers — dropdown → tooltip

> Note: Light-mode tokens filled in `civil-web/src/theme/` and `civil-mobile/src/theme/`. Dark mode still TBD.

---

## 12. Component / UI Foundation

### Web (`civil-web`)

- [x] Component library chosen: [shadcn/ui](https://ui.shadcn.com/)
- [x] Directory structure defined
  - [x] `civil-web/src/components/ui/`
  - [x] `civil-web/src/components/layout/`
  - [x] `civil-web/src/components/forms/`
  - [x] `civil-web/src/components/feedback/`
  - [x] `civil-web/src/components/navigation/`
- [x] Scaffold essential UI components (import/customize as needed):
  - [x] Button
  - [x] Input
  - [x] Textarea
  - [x] Select
  - [x] Checkbox
  - [x] Radio Group
  - [x] Switch
  - [x] Label
  - [x] Form
  - [x] Dialog
  - [x] Alert Dialog
  - [x] Dropdown Menu
  - [x] Popover
  - [x] Tooltip
  - [x] Card
  - [x] Table
  - [x] Pagination
  - [x] Tabs
  - [x] Badge
  - [x] Alert
  - [x] Toast / Sonner
  - [x] Skeleton
  - [x] Separator
  - [x] Avatar
  - [x] Calendar / Date Picker
- [x] Scaffold layout/application components:
  - [x] App layout
  - [x] Header
  - [x] Sidebar
  - [x] Navigation
  - [x] Page container
  - [x] Page header
  - [x] Responsive layout primitives
- [x] Follow component rules:
  - [x] Use shadcn/ui primitives where suitable; do not reimplement available primitives
  - [x] Customize shadcn/ui only for project-specific changes
  - [x] Build new components only when gaps exist in the library
  - [x] Add components incrementally, not the full catalog up front
  - [x] Keep components reusable and domain-agnostic

---

### Mobile (`civil-mobile`)

- [x] Component library chosen: [gluestack-ui](https://gluestack.io/)
- [x] Directory structure defined
  - [x] `civil-mobile/src/components/ui/`
  - [x] `civil-mobile/src/components/layout/`
  - [x] `civil-mobile/src/components/forms/`
  - [x] `civil-mobile/src/components/feedback/`
  - [x] `civil-mobile/src/components/navigation/`
- [x] Scaffold essential UI components (import/customize as needed):
  - [x] Button
  - [x] Input
  - [x] Textarea
  - [x] Select
  - [x] Checkbox
  - [x] Radio
  - [x] Switch
  - [x] Form
  - [x] Modal
  - [x] Alert Dialog
  - [x] Actionsheet
  - [x] Menu
  - [x] Popover
  - [x] Tooltip
  - [x] Card
  - [x] Table / List representation (as appropriate)
  - [x] Tabs
  - [x] Badge
  - [x] Alert
  - [x] Toast
  - [x] Spinner
  - [x] Skeleton
  - [x] Divider
  - [x] Avatar
  - [x] Icon
- [x] Scaffold layout/application components:
  - [x] App layout
  - [x] Header
  - [x] Screen container
  - [x] Page/section header
  - [x] Bottom navigation (where required)
  - [x] Navigation components
  - [x] Responsive/adaptive layout primitives (where required)
- [x] Follow component rules:
  - [x] Use gluestack-ui primitives where suitable
  - [x] Customize only for project-specific design or behavior
  - [x] Build custom components only if gluestack-ui has no suitable option
  - [x] Add components incrementally, not the full catalog up front
  - [x] Components remain domain-independent and reusable
  - [x] Encapsulate mobile-specific UI logic within mobile codebase only

## 13. State / Data Foundation

- [x] Zustand adopted for client / UI state — `useAuthStore` on web + mobile
- [x] What belongs in Zustand defined
- [x] What must NOT go in Zustand defined
- [x] Store structure / naming defined — `<domain>Store.ts` / `use<Domain>Store` / `civil-<app>-<domain>` keys
- [x] Persistence rules defined — default off; auth session only (`user`+`tokens`); web `localStorage`, mobile SecureStore; always `partialize` + `isHydrated` gate
- [x] Server-state tool chosen (e.g. TanStack Query) or deferred intentionally — deferred; use `services/` + `useRemoteData` / local feature state until a cache lib is justified
- [x] Rule locked: Zustand ≠ API cache / database

> Decision: [`Docs/[3] Decisions/[5] Client State (Zustand).md`](<../[3]%20Decisions/[5]%20Client%20State%20(Zustand).md>)

---

## 14. Environment / Configuration Foundation

- [x] `backend/.env`
- [x] `backend/.env.staging`
- [x] `backend/.env.production`
- [x] `backend/.env.example`
- [x] `civil-web/.env`
- [x] `civil-web/.env.staging`
- [x] `civil-web/.env.production`
- [x] `civil-web/.env.example`
- [x] `civil-mobile/.env`
- [x] `civil-mobile/.env.staging`
- [x] `civil-mobile/.env.production`
- [x] `civil-mobile/.env.example`
- [x] Dev / staging / prod environments defined
- [x] Secret policy defined (no secrets in Git)
- [x] Public prefix rules: `VITE_*` / `EXPO_PUBLIC_*`
- [x] Config module (backend) loads env centrally
- [x] Env validation (Zod in `backend/src/config`) — CORS key: `CORS_ORIGINS`
- [x] Local `DATABASE_URL` aligned with Compose Postgres (`127.0.0.1` / db `civil`)
- [x] Staging/prod Compose overrides `DATABASE_URL` host to `postgres`
- [x] Redis env optional / skipped until Redis is wired

---

## 15. Redis / Queue Foundation

- [x] Redis role decided (cache / queue / both)
- [x] Cache key convention
- [x] Cache TTL policy
- [x] Cache invalidation strategy
- [x] What not to cache defined
- [ ] Queue library chosen (when needed)
- [ ] Job structure defined
- [x] Retry / backoff rules
- [ ] Failed-job handling
- [x] Idempotency rules
- [ ] Workers layout (`jobs/`)
- [ ] Queue monitoring approach
- [x] Rule locked: Redis is not miscellaneous storage

---

## 16. Storage Foundation

- [ ] Storage provider chosen (still TBD until locked)
- [ ] Bucket / folder / object key convention
- [x] Upload authorization flow
- [x] Presigned URL flow
- [x] File metadata in Postgres
- [x] File validation (size / MIME)
- [x] Access control
- [ ] Deletion / CDN / backups (as needed)
- [x] Rule locked: do not proxy large uploads through Express by default

---

## 17. Security Foundation

- [x] HTTPS — TLS at Nginx edge only; Express internal HTTP + `TRUST_PROXY` in staging/prod
- [x] CORS allowlist
- [x] Security headers (Helmet)
- [x] Rate limiting — general API + stricter `/auth/*` (`express-rate-limit`)
- [x] Request size limiting — `express.json({ limit: JSON_BODY_LIMIT })` default `100kb`
- [x] Input validation on backend
- [x] Authn + authz enforced server-side
- [x] Password hashing — bcrypt cost 12
- [x] Access / refresh token security
- [x] Secure cookie / secure mobile token storage
- [x] Secrets management
- [x] SQL injection prevention (Prisma / parameterized)
- [x] File-upload security
- [x] No sensitive data in logs
- [x] Dependency audit process — `audit:deps` (high) + CI `audit:deps:ci` (critical gate)
- [x] Production security config reviewed — pre-deploy checklist in Security decision

> Decision: [`Docs/[3] Decisions/[6] Security Foundation.md`](../[3]%20Decisions/[6]%20Security%20Foundation.md)

---

## 18. Testing Foundation

- [x] Unit test approach
- [x] Service tests
- [x] Repository / integration tests
- [x] API tests (incl. auth / authz)
- [x] E2E tests (web; mobile as needed)
- [x] Test DB / fixtures strategy
- [x] CI runs tests

> Stack + scripts live: `Docs/[3] Decisions/[3] CI & Testing.md`, `.github/workflows/ci.yml`. Backend: Vitest unit (auth/health/tokens/authenticate/authorize/authz ownership) + integration (health/validation/auth API) + e2e (health/auth vs Test Postgres). Web: Vitest unit + Playwright auth smoke. Mobile: Jest `parseForm` unit.

---

## 19. Code Quality Foundation

- [x] TypeScript strict mode — web / mobile / backend
- [x] ESLint — per-app flat configs; root `npm run lint`
- [x] Prettier — root config + `format` / `format:check`; Husky + lint-staged
- [x] Import organization rules — `eslint-plugin-simple-import-sort`
- [x] Naming conventions (files / folders / vars / functions / components)
- [x] No `any` unless justified
- [x] No duplicate logic / giant files / premature abstraction
- [x] No dead code / unused deps / utils dumping ground

> Decision: [`Docs/[3] Decisions/[1] Formatting & Linting.md`](../[3]%20Decisions/[1]%20Formatting%20%26%20Linting.md)  
> Commands (repo root): `npm run format` · `npm run format:check` · `npm run lint` · `npm run typecheck`

---

## 20. Docker / Deployment Foundation

Decision: [`Docs/[3] Decisions/[4] Docker & Infrastructure.md`](../[3]%20Decisions/[4]%20Docker%20%26%20Infrastructure.md)

- [x] Docker strategy locked (local + production; Compose at root; no mobile prod Dockerfile)
- [x] `civil-web/Dockerfile` + `.dockerignore`
- [x] `backend/Dockerfile` + `.dockerignore`
- [x] Rule locked: no production Dockerfile for `civil-mobile/`
- [x] `docker-compose.yml` (dev — Postgres only)
- [x] `docker-compose.staging.yml` (Postgres + API + web; no Redis yet)
- [x] `docker-compose.production.yml` (Postgres + API + web; no Redis yet)
- [x] Services planned: Nginx (when ready), web, API, Postgres, Redis (+ worker if needed)
- [x] Container networking (Compose network)
- [x] Volumes (Postgres required)
- [x] Health checks (Compose + Dockerfiles)
- [x] Restart / resource / logging policy (documented; production restart in override)
- [x] Secrets injection (env / host — not baked into images)
- [x] Nginx reverse proxy (rule locked; config folder when ready)
- [ ] SSL / domains / firewall / backups
- [x] Rule locked: Nginx is sole public entry
- [ ] `infrastructure/nginx/` (create when Nginx config is real — not empty)
- [ ] `infrastructure/docker/` (only if needed beyond root Compose)

> Note: Scaffold Dockerfiles + Compose exist. Edge Nginx config and hardened VPS wiring remain TODO.

---

## 21. CI/CD Foundation

- [x] Remote repo on GitHub / GitLab
- [x] CI: install
- [x] CI: typecheck
- [x] CI: lint
- [x] CI: tests
- [x] CI: build
- [ ] CI: Docker build (when ready)
- [ ] CI: migration checks (when ready)
- [ ] Deploy to staging — auto after CI green on **`dev`** (later)
- [ ] Deploy to production — auto after CI green on **`main`** (later)
- [ ] Rollback approach

> Workflow: same suite on push/PR to **`dev` and `main`**. Branches: `play` (daily) → `dev` (staging) → `main` (prod). CD jobs not wired yet.

---

## 22. Database Operations

- [ ] Automated backups
- [ ] Backup retention
- [ ] Restore procedure tested
- [ ] Prod migration procedure
- [ ] DB monitoring (connections / indexes / slow queries)

---

## 23. Observability

- [ ] Application logs
- [ ] Request logs
- [x] Error tracking — `error_logs` table + SUPER inbox (`GET /api/v1/error-logs`); persists unexpected/5xx only (not every 400)
- [ ] DB / Redis monitoring
- [x] Host metrics (CPU / RAM / disk / uptime) — use VPS provider panel/alerts
- [x] Health / readiness / liveness endpoints — `/api/v1/health`, `/api/v1/health/db`
- [ ] Alerts

> Also: `activity_logs` audit table + SUPER list UI (`/super/activity`). Structured stdout request/app logs still TBD. Seed: `super@example.com` / `admin@example.com` (password `password`, local/dev only).

---

## 24. Documentation Foundation

- [x] `docs/architecture/`
- [x] `docs/api/`
- [x] `docs/database/`
- [x] `docs/deployment/`
- [x] `docs/development/`
- [x] `docs/decisions/`
- [x] Architecture documented
- [x] Folder conventions documented
- [x] API conventions documented
- [x] Database conventions documented
- [x] Auth documented
- [x] Env vars documented
- [x] Local setup documented
- [x] Deployment / Docker documented
- [x] Code rules documented
- [x] Key decisions recorded
- [x] Docs kept in sync with code

> Note: `docs/` is an **index** (README map per topic). Long-form truth stays in `Docs/[1] Main App/`, `Docs/[3] Decisions/`, and `.cursor/rules/`. Sync rule: update sources first, then checklist / index links — see `docs/README.md`.

---

## 25. Cursor / AI Rules

- [x] Core project rules in `.cursor/rules/`
- [x] Backend rules
- [x] Web rules
- [x] Mobile rules
- [x] Docker / deploy rules
- [x] Architecture / DDD / layer rules covered
- [x] Naming / TypeScript / API / Prisma / validation covered
- [x] Auth / security / state / theme / testing covered
- [x] Simplicity + dependency rules covered
- [x] Working principles locked (reuse patterns, no unnecessary files, ask before architecture changes, never bypass layers)

---

## 26. Final Bedrock Structure

- [x] `docs/` tree in place (as needed)
- [ ] `civil-web/src/` feature + theme + services layout
- [x] `civil-mobile/src/` feature + theme + services + navigation layout
- [ ] `backend/src/modules/` + middleware / config / database / jobs
- [x] `backend/prisma/` schema + migrations
- [x] Root `docker-compose.yml` + `docker-compose.staging.yml` + `docker-compose.production.yml`
- [x] `civil-web/Dockerfile` + `.dockerignore`
- [x] `backend/Dockerfile` + `.dockerignore`
- [ ] `infrastructure/nginx/` (when ready — do not create empty)
- [ ] `infrastructure/docker/` (when ready — do not create empty)
- [ ] `.github/workflows/` (when ready)
- [x] Rule locked: do not create every folder/abstraction before features
- [x] Order locked: boundaries → infra you need → standards → design system → feature development
- [x] Docker layout decision locked (`Docs/[3] Decisions/[4] Docker & Infrastructure.md`)
