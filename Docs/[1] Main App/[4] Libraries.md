# Libraries

Locked testing + quality + UI libs. Paths: `civil-web/` · `civil-mobile/` · `backend/`  
Decision: [CI & Testing](../[3]%20Decisions/[3]%20CI%20%26%20Testing.md)

---

## 1. Web (`civil-web/`)

### UI

**[shadcn/ui](https://ui.shadcn.com/)** — installed (Vite + Tailwind v4, Nova preset)

```bash
# Prerequisites (Tailwind + path alias) — already done in this repo
cd civil-web
npm i tailwindcss @tailwindcss/vite
npm i -D @types/node

# Init shadcn (non-interactive)
npx shadcn@latest init --preset nova -y --force

# Add components as needed (copy into src/components/ui)
npx shadcn@latest add button -y
```

Config: `civil-web/components.json` · utils: `civil-web/src/lib/utils.ts` · UI: `civil-web/src/components/ui/`

### Testing

**Vitest** — installed

```bash
cd civil-web && npm i -D vitest
```

**React Testing Library** — installed

```bash
cd civil-web && npm i -D @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

**Playwright** — installed + Chromium browsers

```bash
cd civil-web && npm i -D @playwright/test && npx playwright install chromium
```

### Folders

```text
civil-web/tests/unit/   ✅
civil-web/tests/e2e/    ✅ (home.spec.ts)
```

### Scripts

```bash
npm run test:unit
npm run test:e2e        # Playwright
npm run test:e2e:ui
```

---

## 2. Mobile (`civil-mobile/`)

### UI

**[gluestack-ui](https://gluestack.io/ui/docs/home/overview/introduction)** v5 — installed (UniWind + Tailwind v4)

Docs: [Installation](https://gluestack.io/ui/docs/home/getting-started/installation) · [CLI](https://gluestack.io/ui/docs/home/getting-started/cli)

```bash
cd civil-mobile

# Preferred (CLI) — may hang on Windows while cloning; see note below
npx gluestack-ui@latest init --uniwind -y --path src/components/ui --use-npm
npx gluestack-ui@latest add button -y

# Manual package install (used when CLI clone stalls on Windows)
npm i uniwind @gluestack-ui/core @gluestack-ui/utils
npm i -D tailwindcss
```

Config: `civil-mobile/gluestack-ui.config.json` · Metro: `civil-mobile/metro.config.js` · CSS: `civil-mobile/global.css` · Provider: `civil-mobile/src/components/ui/gluestack-ui-provider/`

**expo-notifications** — installed (push bedrock; register device tokens + tap deep links)

```bash
cd civil-mobile && npx expo install expo-notifications
```

> Note: Official CLI Windows support is still WIP; this repo used the UniWind manual package path + starter-kit provider wiring. Essential checklist components were copied from the [UniWind Expo starter](https://github.com/gluestack/gluestack-ui/tree/main/apps/starter-kit-expo-uniwind/components/ui) into `src/components/ui/`. Prefer `npx gluestack-ui@latest add <name> -y` when the CLI works on your OS.

### Testing

**Jest** — installed

```bash
cd civil-mobile && npx expo install jest-expo jest @types/jest @react-native/jest-preset
```

**React Native Testing Library** — installed

```bash
cd civil-mobile && npm i -D @testing-library/react-native react-test-renderer@19.2.3
```

**Detox** — installed + configured (Android emulator)

```bash
cd civil-mobile && npm i -D detox detox-cli
```

Needs: Android emulator AVD + `npx expo prebuild --platform android` before first run.

### Folders

```text
civil-mobile/tests/unit/  ✅
civil-mobile/tests/e2e/   ✅ (smoke.e2e.ts + README)
```

### Scripts

```bash
npm run test:unit
npm run test:e2e:build   # Detox build APK
npm run test:e2e         # Detox test (emulator required)
```

---

## 3. Backend (`backend/`)

### Libraries

**Vitest** — installed

```bash
cd backend && npm i -D vitest typescript tsx @types/node @types/express @types/cors
```

**Supertest** — installed

```bash
cd backend && npm i -D supertest @types/supertest
```

**Zod** — installed (request validation / DTOs; backend authority)

```bash
cd backend && npm i zod
```

**Helmet** — installed (HTTP security headers)

```bash
cd backend && npm i helmet
```

**express-rate-limit** — installed (API + auth rate limiting; in-process memory store, no Redis)

```bash
cd backend && npm i express-rate-limit
```

**Pino** + **pino-http** — installed (application + HTTP access logs → stdout)

```bash
cd backend && npm i pino pino-http
```

Config: `LOG_LEVEL` · module: `backend/src/logging/` · middleware: `request-logger.ts`

**Prisma** — installed (ORM for PostgreSQL; repository-only Client)

```bash
cd backend && npm i @prisma/client @prisma/adapter-pg && npm i -D prisma
```

- Schema: `backend/prisma/schema.prisma` (domain sections; models TBD)
- Config: `backend/prisma.config.ts` (`DATABASE_URL`)
- Client: `backend/src/database/` → generated under `src/generated/prisma/`
- Seed stub: `backend/prisma/seed.ts` (no-op until models exist)

```bash
npm run prisma:generate
npm run db:migrate
npm run db:seed
npm run prisma:studio
```

**Cloudflare R2 (S3 API)** — installed (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`)

```bash
cd backend && npm i @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

- Decision: `Docs/[3] Decisions/[10] Storage (Cloudflare R2).md`
- Adapter: `backend/src/storage/` · domain: `backend/src/modules/files/`
- Clients: web `browser-image-compression` + `services/files.ts`; mobile `expo-image-manipulator` + `services/files.ts`

**Test PostgreSQL**

- **embedded-postgres** auto-starts in e2e `globalSetup` (no Docker; `docker-compose.test.yml` removed)
- Production/dev app DB is Supabase Postgres
- Client: `pg`

```bash
cd backend && npm i pg && npm i -D @types/pg embedded-postgres
```

### Folders

```text
backend/tests/unit/         ✅
backend/tests/integration/  ✅
backend/tests/e2e/          ✅ (health.e2e.test.ts)
```

### Scripts

```bash
npm run dev                 # tsx watch → src/server.ts
npm run build               # prisma generate + tsc → dist/
npm run start               # node dist/src/server.js
npm run prisma:generate
npm run db:migrate
npm run test:unit
npm run test:integration
npm run test:e2e            # embedded Postgres + /health/db
```

---

## 4. Globally (repo root)

Still planned: Prettier / ESLint root / Husky — [Formatting & Linting](../[3]%20Decisions/[1]%20Formatting%20%26%20Linting.md)

### Test levels

Unit · Integration · E2E — no separate feature-test category.
