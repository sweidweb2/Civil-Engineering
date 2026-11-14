# Notes — CI today & mobile release split

**Status:** DISCUSSION (notes to revisit later; not a new lock)  
**Date:** 2026-11-14  
**Applies to:** `.github/workflows/ci.yml`, future mobile PR CI + store/release CD  
**Related:** [CI & Testing](./[3]%20CI%20%26%20Testing.md), [Mobile Client Parked](./[11]%20Mobile%20Client%20Parked.md)

---

## What CI does today

**File:** `.github/workflows/ci.yml`  
**Runs on:** PRs/pushes to `dev` + `main` (and manual `workflow_dispatch`)

| Job       | When it runs                                  | What it does                                                       |
| --------- | --------------------------------------------- | ------------------------------------------------------------------ |
| `changes` | always                                        | Path filter: `civil-web`, `civil-mobile`, `backend`, shared, docs  |
| `quality` | if web or mobile or backend or shared changed | format / lint / typecheck (TODOs if scripts missing)               |
| `web`     | only if `civil-web/**` or shared              | audit, Vitest unit, build; Playwright e2e off (`CI_RUN_E2E=false`) |
| `mobile`  | only if `civil-mobile/**` or shared           | audit, Jest unit (when exists); Detox e2e off                      |
| `backend` | only if `backend/**` or shared                | Prisma migrate, unit, integration, build; API e2e off              |

**Docs-only changes:** path filter exists, but `quality` still skips unless app/shared paths changed.

**CD/deploy is not in this file** — Vercel is separate; store builds aren’t wired yet.

---

## Mobile-only push: does web CI rerun?

**No.** Web and backend jobs do **not** run on a pure `civil-mobile/**` change. That’s already how it’s set up.

What **does** still run on mobile-only:

1. `changes`
2. `quality` (because mobile changed)
3. `mobile`

So you don’t pay for web/backend test+build on mobile-only PRs. Good.

---

## Should mobile CI live in this same file?

**Yes for GitHub quality gates** — keep the `mobile` job in this `ci.yml` (lint/unit/typecheck when you add scripts). Same PR check surface as web/backend.

**Store / native release CI is different** — don’t put full App Store / Play shipping inside this same “every PR” job.

### Split

| Concern                                           | Where                                                                                   |
| ------------------------------------------------- | --------------------------------------------------------------------------------------- |
| PR checks (unit, lint, maybe Detox later)         | Keep in this `ci.yml` `mobile` job                                                      |
| iOS/Android binary build + TestFlight/Play upload | Separate workflow or EAS (`eas build` / `eas submit`), triggered on tags/release/`main` |

Same repo, two layers:

- **GitHub CI** = “is the code OK?”
- **EAS / release workflow** = “build & ship the app”

You can call EAS from a second workflow file (e.g. `.github/workflows/mobile-release.yml`) later — still this monorepo, not a second git repo.

---

## Bottom line (for later discussion)

- Keep mobile PR CI here (already stubbed in `ci.yml`).
- Don’t gitignore mobile (when/if the tree is restored; see parked decision).
- Don’t expect this file to replace App Store/Play CD — add EAS/release when you’re ready to ship.

---

## Open questions (discuss later)

- [ ] When mobile is unparked: restore `civil-mobile/` + wire npm scripts so the `mobile` job goes green
- [ ] Whether Detox stays PR-gated (label / `main` only) same as Playwright policy in [CI & Testing](./[3]%20CI%20%26%20Testing.md)
- [ ] Exact trigger for store builds (tag vs `main` vs manual) and secrets layout
- [ ] Whether docs-only PRs should get a dedicated lightweight job beyond path filter
