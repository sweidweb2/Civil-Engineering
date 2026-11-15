# Customized commands (repo root)

## Database

```bash
npm run db:migrate   # apply pending Prisma migrations
npm run db:seed      # seed
```

## Husky / quality (same as git hooks + CI quality job)

| When           | What runs                                                         |
| -------------- | ----------------------------------------------------------------- |
| **pre-commit** | `npx lint-staged` (Prettier/ESLint on staged files, incl. mobile) |
| **pre-push**   | `npm run ci:local`                                                |
| **CI quality** | format · lint · typecheck (web + **mobile** + backend)            |

```bash
npm run format:check   # Prettier --check
npm run lint           # ESLint (web + mobile + backend)
npm run typecheck      # tsc (web + mobile + backend)
npm run ci:local       # all three (husky pre-push)
```

## Tests (e2e off)

```bash
npm run test:unit          # backend + web + mobile unit
npm run test:integration   # backend integration (embedded Postgres locally)
npm run test:ci            # ci:local + unit + integration

# Per-app
npm run test:unit --prefix backend
npm run test:integration --prefix backend
npm run test:integration:local --prefix backend
npm run test:unit --prefix civil-web
npm run test:unit --prefix civil-mobile

# E2E disabled for now (CI_RUN_E2E=false; mobile scripts are no-ops)
```
