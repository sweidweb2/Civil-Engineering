# Decision — CI & Testing

**Status:** LOCKED (workflows scaffolded; packages not installed yet)  
**Date:** 2026-09-18  
**Applies to:** `civil-web/`, `civil-mobile/`, `backend/`, root CI

Repo paths (actual):

| Logical app | Folder |
| --- | --- |
| Web | `civil-web/` |
| Mobile | `civil-mobile/` |
| Backend | `backend/` |

---

## Testing stack (locked)

### Web (`civil-web/`)

| Concern | Choice |
| --- | --- |
| Unit | **Vitest** + **React Testing Library** |
| E2E | **Playwright** |
| Layout | `civil-web/tests/unit/`, `civil-web/tests/e2e/` |

### Mobile (`civil-mobile/`)

| Concern | Choice |
| --- | --- |
| Unit | **Jest** + **React Native Testing Library** |
| E2E | **Detox** |
| Layout | `civil-mobile/tests/unit/`, `civil-mobile/tests/e2e/` |

### Backend (`backend/`)

| Concern | Choice |
| --- | --- |
| Unit | **Vitest** |
| HTTP / API | **Supertest** |
| DB | **Test PostgreSQL** (isolated DB / container in CI) |
| Layout | `backend/tests/unit/`, `backend/tests/integration/`, `backend/tests/e2e/` |

---

## Test levels

| Level | Meaning | Where |
| --- | --- | --- |
| **Unit** | Pure logic, components, services with mocks | all apps |
| **Integration** | Modules + real collaborators (e.g. API + test DB) | backend primarily |
| **E2E** | Full user/API flows | web Playwright, mobile Detox, backend API e2e |

### Feature testing

- **No** separate “feature-test” category.
- Each feature is covered at the **appropriate levels** (unit and/or integration and/or e2e) inside the folders above.

---

## Global quality checks (every relevant CI run)

1. **Format check** (Prettier `--check`)  
2. **ESLint**  
3. **TypeScript typecheck**  

See [Formatting & Linting](./[1]%20Formatting%20%26%20Linting.md).

---

## Change detection

| Changed paths | Run |
| --- | --- |
| `civil-web/**` | Web quality + web unit (+ web e2e per policy) + web build |
| `civil-mobile/**` | Mobile quality + mobile unit (+ mobile e2e per policy) |
| `backend/**` | Backend quality + backend unit/integration (+ backend e2e per policy) + backend build |
| Shared / root / infra | **Broader checks** — format/lint/typecheck across repo + tests/builds for **all** apps that exist |

Shared / broader triggers include (non-exhaustive):

- Root `package.json`, lockfiles, Prettier/ESLint/tsconfig
- `.github/**`
- `Docs/**` only → docs-only job (quality optional; skip app tests unless desired)
- `infrastructure/**` (when present), root `docker-compose*.yml`, app `Dockerfile`s / Nginx config
- `.cursor/rules/**` → treat as shared (at least format/lint/typecheck; full suite if rules imply contract changes — default **broader**)

Docker layout decision: `Docs/[3] Decisions/[4] Docker & Infrastructure.md`.
---

## CI / PR pipeline

```text
PR opened/updated → detect changed apps
       ↓
Format check
ESLint
TypeScript typecheck
       ↓
Tests for affected apps (unit / integration)
       ↓
Build affected apps
       ↓
E2E according to PR policy
```

### E2E PR policy (locked)

| Target branch | E2E |
| --- | --- |
| PR → **`dev`** | **Skip by default.** Run only if label `e2e` is present (or manual `workflow_dispatch`). |
| PR → **`main`** | **Run E2E for affected apps** (and all apps if broader/shared change). |
| Owner direct push | No PR CI; prefer PR for anything that needs E2E confidence. |

Unit + integration + format/lint/typecheck/build still run on PRs to **both** `dev` and `main` for affected apps.

---

## Required npm scripts (contract — install later)

Root (orchestration):

- `format:check`
- `lint`
- `typecheck`

Per app (examples):

- `civil-web`: `test:unit`, `test:e2e`, `build`
- `civil-mobile`: `test:unit`, `test:e2e`
- `backend`: `test:unit`, `test:integration`, `test:e2e`, `build`

CI calls these scripts; do not invent alternate names without updating this decision + workflow.

---

## Workflow file

- GitHub Actions: `.github/workflows/ci.yml`
- Status: scaffolded now; will go green after packages/scripts exist.

---

## Implementation checklist

- [x] Decision locked + Libraries listed
- [x] `.github/workflows/ci.yml` scaffold
- [ ] Install test libs (see Libraries.md) — **not yet**
- [ ] Create `tests/unit` / `tests/e2e` / `tests/integration` folders
- [ ] Wire npm scripts
- [ ] Test PostgreSQL service in CI for backend integration
- [ ] Playwright / Detox CI runners when E2E is enabled
- [ ] Mark CI checks required on `dev` + `main` branch protection

---

## Related

- [Formatting & Linting](./[1]%20Formatting%20%26%20Linting.md)
- [Git Branch Strategy](./[2]%20Git%20Branch%20Strategy.md)
- [Libraries](../[1]%20Main%20App/[4]%20Libraries.md)
- [Contributing](../[1]%20Main%20App/[3]%20Contributing.md)
