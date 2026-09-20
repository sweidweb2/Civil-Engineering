# Decision — Git Branch Strategy

**Status:** LOCKED (enforce on GitHub/GitLab when remote exists)  
**Date:** 2026-09-18  
**Applies to:** entire repository

---

## Decision

| Branch                              | Environment | Purpose                                       |
| ----------------------------------- | ----------- | --------------------------------------------- |
| **`main`**                          | Production  | Always deployable prod code                   |
| **`dev`**                           | Staging     | Integration branch; staging deploys from here |
| **`feat/*`, `fix/*`, `chore/*`, …** | Local / PR  | Short-lived work branches                     |

Workflow:

```text
Create issue/task
       ↓
Create branch from dev (prefer) — or from main for hotfixes
       ↓
Develop + commit (Husky → lint-staged)
       ↓
Push
       ↓
Pull Request → target branch
       ↓
CI must pass
  ├── lint
  ├── typecheck
  ├── tests
  └── build
       ↓
Review (repo owner merges)
       ↓
Merge → delete branch
```

Promotion path:

```text
feat/fix/chore/...  ──PR──►  dev  (staging)
                              │
                         ──PR──►  main (production)
```

Hotfix (prod-only emergency): branch from `main` → PR into `main` → also merge/backport into `dev` so staging does not drift.

---

## Branch naming

Aligned with [Contributing](../[1]%20Main%20App/[3]%20Contributing.md):

| Prefix      | Use                    |
| ----------- | ---------------------- |
| `feat/`     | Feature                |
| `fix/`      | Bug fix                |
| `chore/`    | Tooling, deps, cleanup |
| `docs/`     | Docs only              |
| `refactor/` | No behavior change     |
| `test/`     | Tests only             |

Examples: `feat/backend-auth-login`, `fix/web-pagination`, `chore/docker`.

---

## Protection rules (remote)

Configure on the host (GitHub/GitLab):

### `main` and `dev`

| Rule                        | Setting                                           |
| --------------------------- | ------------------------------------------------- |
| Direct pushes               | **Disabled** for normal contributors              |
| Pull request required       | **Yes**                                           |
| Required approvals          | **Yes — repo owner reviews and merges**           |
| Required status checks (CI) | **Yes** — lint, typecheck, tests, build must pass |
| Conversations resolved      | Recommended                                       |
| Delete branch on merge      | **Yes** (enable auto-delete)                      |

### Merge strategy

| Merge into                | Strategy                                                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `dev` ← feature/fix/chore | **Squash and merge** (clean history on `dev`)                                                                                               |
| `main` ← `dev` (release)  | **Merge commit** (keeps a clear release boundary) _or_ squash if you prefer a flatter `main` — default: **merge commit** for `dev` → `main` |
| Hotfix → `main`           | Squash or merge commit; then sync to `dev`                                                                                                  |

---

## Can the owner push directly to `dev` and `main`?

**Yes.** As repo owner/admin you **may** push directly when needed.

### How (GitHub example)

On branch protection for `main` and `dev`:

1. Require PRs + required CI checks for everyone.
2. Enable **“Allow specified actors to bypass required pull requests”** (or equivalent) and add **your owner account**,  
   **or** use admin bypass if your plan exposes “Do not enforce for administrators”.

### Policy for owner bypass

Use direct push only for:

- Emergency hotfixes
- Repo bootstrap / protection setup
- Trivial doc/chore fixes when a full PR is pure overhead

Prefer a PR even as owner for anything non-trivial — CI still runs on PRs and review history stays clear.

**Contributors** never get bypass: always branch → PR → CI → owner merge.

---

## CI on every PR to `dev` or `main`

Required checks (once workflows exist):

- [ ] `lint`
- [ ] `typecheck`
- [ ] `tests`
- [ ] `build` (apps touched / full monorepo as configured)

No merge to `dev` or `main` while checks are red (except owner emergency bypass).

---

## Local + remote workflow summary

```text
dev / main (protected)
        ▲
        │ PR + CI + owner merge
        │
feat/*  fix/*  chore/*  docs/*  ...
        ▲
        │ commits (Husky + lint-staged)
        │
    developer machine
```

Owner optional path:

```text
owner machine ──direct push──► dev or main
                 (bypass allowed; use sparingly)
```

---

## Implementation checklist

- [ ] Create `main` and `dev` on remote
- [ ] Set default branch (recommend `dev` for day-to-day PRs, or `main` — pick one and document in README; **recommendation: default = `dev`**)
- [ ] Protect `main` and `dev` (PR required, CI required, owner bypass enabled)
- [ ] Require owner approval / owner-only merge
- [ ] Enable auto-delete of head branches after merge
- [ ] Add GitHub Actions (or GitLab CI) for lint / typecheck / tests / build
  - Scaffold: `.github/workflows/ci.yml` + [CI & Testing](./[3]%20CI%20%26%20Testing.md)
- [ ] Update Contributing + README with this flow

---

## Related

- [Contributing](../[1]%20Main%20App/[3]%20Contributing.md)
- [Formatting & Linting](./[1]%20Formatting%20%26%20Linting.md)
- [Bedrock Checklist](../[1]%20Main%20App/[2]%20Bedrock%20Checklist.md) §1 / §21
