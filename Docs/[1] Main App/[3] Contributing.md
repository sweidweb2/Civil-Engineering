# Contributing

How to work in this monorepo without breaking the locked architecture.

## Before you change anything

1. Read [Tech Stack](./[1]%20Tech%20Stack.md) — locked decisions.
2. Skim [Bedrock Checklist](./[2]%20Bedrock%20Checklist.md) for foundation status.
3. Follow Cursor rules in `.cursor/rules/` (especially `project-core.mdc`).
4. Prefer the root [README](../../README.md) for run / env / structure.

If a change would alter stack, layers, API shape, or module boundaries — **ask first**. Do not silently unlock or replace decisions.

## Repository layout

| Path | Own |
| --- | --- |
| `civil-web/` | React web client |
| `civil-mobile/` | React Native (Expo) client |
| `backend/` | Express API + Prisma + jobs |
| `docker-compose*.yml` | Root Compose (local / production) |
| `Docs/` | Architecture, checklists, prompts, decisions |
| `.cursor/rules/` | AI / coding rules |
| `infrastructure/` | Optional — Nginx / extra Docker only when real |

Work in the smallest relevant app. Do not cross-wire clients into the database.

## Architecture rules (non-negotiable)

- **Monolith backend**, domain modules under `backend/src/modules/`.
- **Layer flow:** Route → Controller → Service → Repository → Prisma → PostgreSQL.
- Controllers stay thin — **no** business workflows, Prisma, or Redis there.
- Repositories — **data access only**; no business orchestration.
- Web / mobile — **REST `/api/v1` only**; never Postgres, Redis, or Prisma.
- Validation: **Zod** on the backend (security); frontend Zod is UX only.
- Client state: **Zustand** for UI/client state — not an API cache.
- Theme tokens live in `src/theme/` — not one-off magic numbers in components.
- Do not introduce microservices, new major libraries, or parallel “god” folders without discussion.

## Coding expectations

1. Understand existing patterns before adding files.
2. Reuse components, services, hooks, and utilities — search first.
3. Keep changes scoped; no drive-by refactors mixed into feature PRs.
4. Follow naming already used in the target app/module.
5. Prefer small functions and clear names (KISS / SRP).
6. No `any` unless briefly justified.
7. Validate all external input on the backend.
8. Use the project error system (typed errors → central middleware → safe client messages).
9. Remove unused code and dependencies you introduce.
10. Do not add a dependency without a concrete reason.

## Branch strategy

Locked in [Git Branch Strategy](../[3]%20Decisions/[2]%20Git%20Branch%20Strategy.md):

- **`main`** → production  
- **`dev`** → staging / integration  
- Short-lived `feat/*`, `fix/*`, `chore/*`, … → PR into `dev`, then promote `dev` → `main`  
- PRs required; **CI must pass**; **repo owner merges**  
- **Owner may push directly** to `dev`/`main` via protection bypass (use sparingly)

### Branch naming

| Prefix | Use |
| --- | --- |
| `feat/` | New feature |
| `fix/` | Bug fix |
| `chore/` | Tooling, deps, cleanup |
| `docs/` | Documentation only |
| `refactor/` | Internal restructure (no behavior change) |
| `test/` | Tests only |

Examples:

```text
feat/backend-auth-login
fix/web-project-list-pagination
docs/contributing-guide
chore/root-editorconfig
```

Branch from `dev` for normal work (from `main` only for prod hotfixes). Delete the branch after merge.

## Commit conventions

Prefer [Conventional Commits](https://www.conventionalcommits.org/):

```text
feat(backend): add project create endpoint
fix(web): correct expense form validation
docs: update contributing guide
chore: ignore env files at repo root
```

Rules:

- One logical change per commit when practical.
- Message explains **why**, not a file dump.
- Never commit secrets, `.env*`, keys, or production credentials.
- Do not commit `node_modules/`, build output, or local IDE noise (see root `.gitignore`).

## Pull requests

Keep PRs **small and reviewable**.

### PR description should include

- What changed and why
- Which app(s): web / mobile / backend
- Screenshots or API examples when UI/API behavior changes
- Notes on migrations, env vars, or breaking API changes
- Checklist of what you verified locally

### Before opening a PR

Run what applies to the touched app(s):

- [ ] Format (when Prettier/format script exists)
- [ ] Lint
- [ ] Typecheck
- [ ] Tests
- [ ] Build (web/backend) or Expo start check (mobile)
- [ ] No secrets in the diff
- [ ] Docs / rules updated if architecture or public API changed
- [ ] Migrations included and reviewed if schema changed

### Review expectations

- Prefer clear boundaries over clever abstractions.
- Reject layer bypasses (e.g. Prisma in controllers, DB from clients).
- Ask for tests on auth, money/inventory rules, and regressions.

## Environment & secrets

- Each app has `.env`, `.env.staging`, `.env.production` — **local only**.
- Commit **`.env.example`** templates when present; never real values.
- Public client vars only: `VITE_*` (web), `EXPO_PUBLIC_*` (mobile).
- Backend owns JWT secrets, DB, Redis, and storage credentials.

## Documentation

Update docs when you change:

- Locked architecture or stack
- API contracts (`/api/v1/...`)
- Env var names
- Run / deploy steps
- Module or folder conventions

Relevant places: `Docs/[1] Main App/`, root `README.md`, and `.cursor/rules/` when AI guidance must stay accurate.

## Quick “do / don’t”

| Do | Don’t |
| --- | --- |
| Follow existing module/feature layout | Invent a parallel structure |
| Ask before architecture changes | Quietly switch stack or layers |
| Keep PRs focused | Mix refactor + feature + formatting |
| Validate & authorize on the backend | Trust the UI for security |
| Reuse theme tokens & shared UI | Hardcode one-off spacing/colors everywhere |
| Explain architectural diffs in the PR | Leave undocumented contract breaks |

## Related docs

- [Tech Stack](./[1]%20Tech%20Stack.md)
- [Bedrock Checklist](./[2]%20Bedrock%20Checklist.md)
- [Formatting & Linting](../[3]%20Decisions/[1]%20Formatting%20%26%20Linting.md)
- [Git Branch Strategy](../[3]%20Decisions/[2]%20Git%20Branch%20Strategy.md)
- [CI & Testing](../[3]%20Decisions/[3]%20CI%20%26%20Testing.md)
- [Docker & Infrastructure](../[3]%20Decisions/[4]%20Docker%20%26%20Infrastructure.md)
- [Libraries](./[4]%20Libraries.md)
- Root [README](../../README.md)
- `.cursor/rules/project-core.mdc`
