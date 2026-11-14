# Decision — Git Branch Strategy

**Status:** LOCKED  
**Date:** 2026-09-20  
**Applies to:** entire repository

---

## Decision

| Branch                              | Environment       | Purpose                                                   |
| ----------------------------------- | ----------------- | --------------------------------------------------------- |
| **`play`**                          | Daily development | Long-lived playground — day-to-day coding happens here    |
| **`dev`**                           | Staging           | Integration / staging deploys from here                   |
| **`main`**                          | Production        | Always deployable prod code                               |
| **`feat/*`, `fix/*`, `chore/*`, …** | Local / PR        | Optional short-lived topic branches (usually from `play`) |

### Environments ↔ branches

| Branch | App env files / Compose                             | Deploy target (later)                |
| ------ | --------------------------------------------------- | ------------------------------------ |
| `play` | Local `.env` + `docker-compose.yml`                 | None (local only)                    |
| `dev`  | `.env.staging` + `docker-compose.staging.yml`       | Staging VPS (auto after CI — TBD)    |
| `main` | `.env.production` + `docker-compose.production.yml` | Production VPS (auto after CI — TBD) |

---

## Workflow

```text
Daily work on play
       ↓
(optional) feat/fix/chore from play → PR into play
       ↓
PR: play → dev
       ↓
CI must pass (same suite as main)
       ↓
Merge → staging (deploy later: auto after CI on dev)
       ↓
PR: dev → main
       ↓
CI must pass (same suite)
       ↓
Merge → production (deploy later: auto after CI on main)
```

Promotion path:

```text
play  (daily development)
  │
  └──PR──►  dev   (staging)
              │
              └──PR──►  main  (production)
```

Hotfix (prod-only emergency): branch from `main` → PR into `main` → also merge/backport into `dev` **and** `play` so nothing drifts.

---

## Branch naming (topic branches)

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

Prefer branching topic work from **`play`**. Solo daily commits may land directly on `play`.

---

## Protection rules (remote)

Configure on GitHub:

### `main` and `dev` (protected)

| Rule                        | Setting                                     |
| --------------------------- | ------------------------------------------- |
| Direct pushes               | **Disabled** for normal contributors        |
| Pull request required       | **Yes**                                     |
| Required approvals          | **Yes — repo owner reviews and merges**     |
| Required status checks (CI) | **Yes** — same CI suite on both branches    |
| Delete branch on merge      | **Yes** for topic branches (not for `play`) |

### `play` (daily)

| Rule          | Setting                                                                         |
| ------------- | ------------------------------------------------------------------------------- |
| Direct pushes | **Allowed** for owner (daily development)                                       |
| PR required   | Optional — use for topic branches into `play` if desired                        |
| CI on push    | Optional / not required — **CI is mandatory when merging into `dev` or `main`** |

### Merge strategy

| Merge into               | Strategy                                                            |
| ------------------------ | ------------------------------------------------------------------- |
| `play` ← topic branches  | Squash (optional)                                                   |
| `dev` ← `play`           | **Squash** or merge commit — prefer squash for a clean staging line |
| `main` ← `dev` (release) | **Merge commit** (clear release boundary)                           |
| Hotfix → `main`          | Squash or merge; then sync `dev` + `play`                           |

---

## Can the owner push directly to `dev` and `main`?

**Yes**, via protection bypass, sparingly (emergency / bootstrap). Prefer PR even as owner.

**Contributors** never bypass: always PR → CI → owner merge into `dev` / `main`.

---

## CI (locked)

Same workflow for **`dev` and `main`**: push **or** pull request runs the identical suite (path-filtered apps).

Source: `.github/workflows/ci.yml`

| Trigger        | Branches                  |
| -------------- | ------------------------- |
| `push`         | `dev`, `main`             |
| `pull_request` | targeting `dev` or `main` |

Checks (affected / shared paths):

- Format · Lint · Typecheck
- App unit tests (+ backend integration)
- App builds
- Dependency audit (critical gate)

E2E remains gated by `CI_RUN_E2E` (still off). When enabled, E2E policy in [CI & Testing](./[3]%20CI%20%26%20Testing.md) still applies.

**Deploy (skip for now — document only):**

| After CI green on | Future action              |
| ----------------- | -------------------------- |
| `dev`             | Auto-deploy staging VPS    |
| `main`            | Auto-deploy production VPS |

Do not add deploy jobs until Nginx / secrets / Hostinger wiring are ready.

---

## Local + remote summary

```text
main (production)  ◄── PR + CI ──  dev (staging)  ◄── PR + CI ──  play (daily)
                                                                      ▲
                                                         feat/fix/chore (optional)
```

Owner optional bypass:

```text
owner ──direct push──► play (normal)
owner ──bypass──► dev or main (sparingly)
```

---

## Implementation checklist

- [x] Create `main`, `dev`, and `play` (local + push when remote exists)
- [x] Document default daily branch = **`play`**
- [ ] Protect `main` and `dev` on GitHub (PR + CI + owner bypass)
- [x] CI: same suite for `dev` and `main` (`.github/workflows/ci.yml`)
- [ ] CD: staging deploy on green `dev` (later)
- [ ] CD: production deploy on green `main` (later)
- [x] Contributing + README aligned

---

## Related

- [Contributing](../[1]%20Main%20App/[3]%20Contributing.md)
- [CI & Testing](./[3]%20CI%20%26%20Testing.md)
- [Formatting & Linting](./[1]%20Formatting%20%26%20Linting.md)
- [Docker & Infrastructure](./[4]%20Docker%20%26%20Infrastructure.md)
- [Bedrock Checklist](../[1]%20Main%20App/[2]%20Bedrock%20Checklist.md) §1 / §21
