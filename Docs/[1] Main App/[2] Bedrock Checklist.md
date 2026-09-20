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
> Branch strategy **decided** in `Docs/[3] Decisions/[2] Git Branch Strategy.md` (`main` + `dev` + PRs + CI). Remote protection still TODO.

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

> Note: Domains are **API/domain stubs only** — no Postgres schema, tables, or Prisma yet (schema still being designed). Repositories must not assume real persistence. List endpoints may return `[]`; mutations return `501 NOT_IMPLEMENTED`. Entity/VO shapes in `*.types.ts` / `*.domain.ts` are provisional until the DB schema is locked. Exact enums/role sets remain TBD where marked.

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

- [ ] Prisma setup
- [ ] Schema organization
- [x] Prisma Client usage rules (repository-only)
- [x] Local / staging / prod DB envs configured
- [x] Migration process defined
- [ ] Seed process defined (if needed)
- [x] Rule locked: migrations are versioned; no manual prod replay as source of truth

> Note: env placeholders exist; Prisma package/schema not installed yet.

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
- [ ] API docs approach chosen (OpenAPI / Swagger)

---

## 7. Authentication & Authorization

### Authentication

- [ ] JWT access tokens
- [ ] Refresh tokens
- [ ] Token rotation / revocation
- [x] Token expiration values set
- [ ] Password hashing
- [ ] Login / logout
- [ ] Password reset (if in scope)
- [ ] Email verification (if in scope)
- [ ] Session / account management rules

### Authorization

- [ ] Roles / permissions model
- [ ] Resource ownership checks
- [ ] Admin rules
- [ ] API auth middleware
- [x] Frontend permission handling approach

> Note: JWT + refresh locked in Tech Stack; env JWT placeholders exist; no auth code yet.

---

## 8. Validation & Error System

### Validation (Zod)

- [ ] Body validation
- [ ] Query validation
- [ ] Params validation
- [x] Backend validation mandatory
- [x] Frontend validation for UX only
- [x] Shared validation strategy documented

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
- [ ] Routing setup
- [ ] Feature-based `src/features/` structure
- [ ] Shared `components/`
- [ ] Shared `hooks/`
- [ ] `services/` API layer
- [ ] Client state approach (Zustand)
- [ ] Server-state approach decided
- [ ] Forms + Zod validation approach
- [ ] Loading / error UI patterns
  - [ ] Inline loading / error states per feature (not one global spinner)
  - [ ] Toast for non-blocking API / mutation failures
  - [ ] Customized error pages (web-only): 404, unexpected/500, React error-boundary fallback
  - [ ] Rule locked: full-page error routes are for `civil-web` only
- [ ] Auth + UI permission handling

---

## 10. Mobile Foundation (React Native)

- [x] React Native + TypeScript + Expo ready
- [x] Navigation setup
- [ ] Feature-based `src/features/` structure
- [ ] Screens / components / hooks layout
- [ ] `services/` API layer
- [ ] Secure token storage
- [ ] Client state approach (Zustand)
- [ ] Forms + validation approach
- [ ] Loading / error handling
  - [ ] Inline loading / error + retry on screens (failed fetches)
  - [ ] Toast for quick / non-blocking API failures
  - [ ] Alert for blocking failures when confirmation is required
  - [ ] Navigate back / to login for missing resource or auth failures
  - [ ] Optional single global crash fallback screen (not a set of error routes)
  - [ ] Rule locked: no dedicated 404/500-style error pages on mobile — toast / inline / navigate instead
- [ ] Deep linking (if in scope)
- [ ] Notifications (if in scope)
- [x] Dev / preview / prod env config

> Note: Expo Router template navigation exists; feature folders / API layer not created yet.

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
- [ ] Semantic colors (success / warning / error / info / disabled) — `success` filled; rest TBD
- [x] Background / surface / text / border (light mode, web + mobile)
- [ ] Spacing scale
- [ ] Typography + semantic text styles
- [ ] Radius scale
- [ ] Shadow scale
- [ ] Global sizes
- [ ] Web breakpoints
- [ ] Web z-index layers

> Note: light brand + surface tokens filled in `colors.ts` (web + mobile). Dark mode and remaining scales still empty/commented.

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

- [ ] Zustand adopted for client / UI state
- [x] What belongs in Zustand defined
- [x] What must NOT go in Zustand defined
- [ ] Store structure / naming defined
- [ ] Persistence rules defined (if any)
- [ ] Server-state tool chosen (e.g. TanStack Query) or deferred intentionally
- [x] Rule locked: Zustand ≠ API cache / database

---

## 14. Environment / Configuration Foundation

- [x] `backend/.env`
- [x] `backend/.env.staging`
- [x] `backend/.env.production`
- [ ] `backend/.env.example`
- [x] `civil-web/.env`
- [x] `civil-web/.env.staging`
- [x] `civil-web/.env.production`
- [ ] `civil-web/.env.example`
- [x] `civil-mobile/.env`
- [x] `civil-mobile/.env.staging`
- [x] `civil-mobile/.env.production`
- [ ] `civil-mobile/.env.example`
- [x] Dev / staging / prod environments defined
- [x] Secret policy defined (no secrets in Git)
- [x] Public prefix rules: `VITE_*` / `EXPO_PUBLIC_*`
- [ ] Config module (backend) loads env centrally
- [ ] Env validation (optional but recommended)

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

- [ ] HTTPS
- [x] CORS allowlist
- [ ] Security headers (Helmet)
- [x] Rate limiting
- [ ] Request size limiting
- [x] Input validation on backend
- [x] Authn + authz enforced server-side
- [ ] Password hashing
- [x] Access / refresh token security
- [x] Secure cookie / secure mobile token storage
- [x] Secrets management
- [x] SQL injection prevention (Prisma / parameterized)
- [x] File-upload security
- [x] No sensitive data in logs
- [ ] Dependency audit process
- [ ] Production security config reviewed

> Note: many security items are **rules/conventions locked**, not runtime middleware yet.

---

## 18. Testing Foundation

- [x] Unit test approach
- [ ] Service tests
- [ ] Repository / integration tests
- [ ] API tests (incl. auth / authz)
- [ ] E2E tests (web; mobile as needed)
- [ ] Test DB / fixtures strategy
- [ ] CI runs tests

> Locked stack + CI scaffold: `Docs/[3] Decisions/[3] CI & Testing.md`, libraries in `Docs/[1] Main App/[4] Libraries.md`, workflow `.github/workflows/ci.yml`. Packages/scripts not installed yet.

---

## 19. Code Quality Foundation

- [ ] TypeScript strict mode
- [ ] ESLint
- [ ] Prettier
- [ ] Import organization rules
- [x] Naming conventions (files / folders / vars / functions / components)
- [x] No `any` unless justified
- [x] No duplicate logic / giant files / premature abstraction
- [x] No dead code / unused deps / utils dumping ground

> Note: Vite web template includes ESLint locally; not standardized across monorepo yet.

---

## 20. Docker / Deployment Foundation

- [ ] Dockerfile(s)
- [ ] `.dockerignore`
- [ ] `docker-compose.yml` (dev)
- [ ] `docker-compose.production.yml` (or override)
- [x] Services: Nginx, API, Postgres, Redis (+ worker if needed)
- [x] Container networking
- [x] Volumes (Postgres required)
- [x] Health checks
- [x] Restart / resource / logging policy
- [x] Secrets injection
- [x] Nginx reverse proxy
- [ ] SSL / domains / firewall / backups
- [x] Rule locked: Nginx is sole public entry

> Note: Docker/Nginx items above are **documented in rules/README**, not implemented as Compose/files yet.

---

## 21. CI/CD Foundation

- [ ] Remote repo on GitHub / GitLab
- [x] CI: install
- [x] CI: typecheck
- [x] CI: lint
- [x] CI: tests
- [x] CI: build
- [ ] CI: Docker build (when ready)
- [ ] CI: migration checks (when ready)
- [ ] Deploy to staging
- [ ] Deploy to production
- [ ] Rollback approach

> Workflow scaffold exists (change detection + quality + per-app jobs). Will stay soft/TODO until scripts & libs are installed.

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
- [ ] Error tracking
- [ ] DB / Redis monitoring
- [ ] Host metrics (CPU / RAM / disk / uptime)
- [ ] Health / readiness / liveness endpoints
- [ ] Alerts

---

## 24. Documentation Foundation

- [ ] `docs/architecture/`
- [ ] `docs/api/`
- [ ] `docs/database/`
- [ ] `docs/deployment/`
- [ ] `docs/development/`
- [ ] `docs/decisions/`
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
- [ ] Docs kept in sync with code

> Note: content lives under `Docs/[1] Main App/` + `Docs/[2] Prompts/` + `.cursor/rules/` (not the `docs/architecture/` tree yet).

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
- [ ] `civil-mobile/src/` feature + theme + services + navigation layout
- [ ] `backend/src/modules/` + middleware / config / database / jobs
- [ ] `backend/prisma/` schema + migrations
- [ ] `infrastructure/nginx/` (when ready)
- [ ] `infrastructure/docker/` (when ready)
- [ ] `.github/workflows/` (when ready)
- [ ] Root compose files (when ready)
- [x] Rule locked: do not create every folder/abstraction before features
- [x] Order locked: boundaries → infra you need → standards → design system → feature development
