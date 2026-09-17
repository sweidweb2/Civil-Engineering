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

- [ ] Express + TypeScript bootstrapped
- [ ] Application bootstrap / HTTP server setup
- [ ] Folder layout: routes → controllers → services → repositories
- [x] DTOs / Zod schemas placement defined
- [x] Domain models / Prisma models placement defined
- [ ] Middleware folder (auth, authz, request context)
- [ ] Central error handling
- [ ] Logging setup
- [ ] Config module
- [x] API response conventions defined
- [x] Per-layer allowed / not-allowed rules written

> Note: `express` + `dotenv` + `cors` installed; no `backend/src`, no TypeScript app bootstrap yet.

---

## 4. DDD / Domain Foundation

- [x] Initial domains identified (auth, users, projects, workers, materials, expenses, …)
- [ ] `backend/src/modules/<domain>/` structure created for first domains
- [ ] Per domain: responsibility defined
- [ ] Per domain: entities defined
- [ ] Per domain: value objects defined (if needed)
- [ ] Per domain: use cases defined
- [ ] Per domain: repository defined
- [ ] Per domain: controller / service defined
- [ ] Per domain: validation schemas defined
- [ ] Per domain: relationships defined
- [ ] Per domain: external access rules defined
- [x] Rule locked: domain owns its business logic and data access

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

- [ ] Custom error types / classes
- [x] Stable error codes
- [x] HTTP status mapping
- [ ] Central error middleware
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

- **Component library:** [shadcn/ui](https://ui.shadcn.com/)
- **Directory structure:**
  - `civil-web/src/components/ui/`
  - `civil-web/src/components/layout/`
  - `civil-web/src/components/forms/`
  - `civil-web/src/components/feedback/`
  - `civil-web/src/components/navigation/`
- **Essential components to scaffold (import/customize as needed):**
  - Button
  - Input
  - Textarea
  - Select
  - Checkbox
  - Radio Group
  - Switch
  - Label
  - Form
  - Dialog
  - Alert Dialog
  - Dropdown Menu
  - Popover
  - Tooltip
  - Card
  - Table
  - Pagination
  - Tabs
  - Badge
  - Alert
  - Toast / Sonner
  - Skeleton
  - Separator
  - Avatar
  - Calendar / Date Picker
- **Layout/application components:**
  - App layout
  - Header
  - Sidebar
  - Navigation
  - Page container
  - Page header
  - Responsive layout primitives
- **Rules:**
  - Use shadcn/ui primitives where suitable; do not reimplement available primitives.
  - Customize shadcn/ui only when project-specific changes are needed.
  - Build new components only when gaps exist in the library.
  - Do not import the full shadcn/ui catalog up front; add incrementally as needed.
  - All components should remain reusable and domain-agnostic.

---

### Mobile (`civil-mobile`)

- **Component library:** [gluestack-ui](https://gluestack.io/)
- **Directory structure:**
  - `civil-mobile/src/components/ui/`
  - `civil-mobile/src/components/layout/`
  - `civil-mobile/src/components/forms/`
  - `civil-mobile/src/components/feedback/`
  - `civil-mobile/src/components/navigation/`
- **Essential components to scaffold (import/customize as needed):**
  - Button
  - Input
  - Textarea
  - Select
  - Checkbox
  - Radio
  - Switch
  - Form
  - Modal
  - Alert Dialog
  - Actionsheet
  - Menu
  - Popover
  - Tooltip
  - Card
  - Table / List representation (where appropriate)
  - Tabs
  - Badge
  - Alert
  - Toast
  - Spinner
  - Skeleton
  - Divider
  - Avatar
  - Icon
- **Layout/application components:**
  - App layout
  - Header
  - Screen container
  - Page/section header
  - Bottom navigation (where required)
  - Navigation components
  - Responsive/adaptive layout primitives (where required)
- **Rules:**
  - Use gluestack-ui primitives instead of rebuilding existing components.
  - Customize only when project-specific design or behavior is necessary.
  - Only build custom components if gluestack-ui does not provide a suitable option.
  - Do not import the entire component catalog up front; add only as needed.
  - Keep components domain-independent and reusable.
  - Encapsulate mobile-specific UI logic within mobile codebase only.


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
