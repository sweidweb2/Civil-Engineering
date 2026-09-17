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

> Note: Official CLI Windows support is still WIP; this repo used the UniWind manual package path + starter-kit provider wiring. Add more components later with `npx gluestack-ui@latest add <name> -y` when the CLI works, or copy from the [UniWind Expo starter](https://github.com/gluestack/gluestack-ui/tree/main/apps/starter-kit-expo-uniwind).

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

**Test PostgreSQL**

- Docker (preferred in CI): `docker-compose.test.yml` on port **5433**
- Local fallback: **embedded-postgres** auto-starts in e2e `globalSetup`
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
npm run test:unit
npm run test:integration
npm run test:db:up          # Docker Postgres (optional if embedded works)
npm run test:e2e            # real Postgres + /health/db
npm run test:db:down
```

---

## 4. Globally (repo root)

Still planned: Prettier / ESLint root / Husky — [Formatting & Linting](../[3]%20Decisions/[1]%20Formatting%20%26%20Linting.md)

### Test levels

Unit · Integration · E2E — no separate feature-test category.
