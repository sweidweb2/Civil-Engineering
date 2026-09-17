# Libraries

Locked testing + quality libs. Paths: `civil-web/` · `civil-mobile/` · `backend/`  
Decision: [CI & Testing](../[3]%20Decisions/[3]%20CI%20%26%20Testing.md)

**E2E runners (Playwright browsers / Detox) are deferred** — folders exist; `test:e2e` is a no-op for now.

---

## 1. Web (`civil-web/`)

### Libraries

**Vitest** — installed

```bash
cd civil-web && npm i -D vitest
```

**React Testing Library** — installed

```bash
cd civil-web && npm i -D @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

**Playwright** — package installed; browser setup later

```bash
cd civil-web && npm i -D @playwright/test
# later: npx playwright install
```

### Folders

```text
civil-web/tests/unit/     ✅
civil-web/tests/e2e/      ✅ (empty until E2E setup)
```

### Scripts

```bash
npm run test:unit   # Vitest
npm run test:e2e    # skipped stub
```

---

## 2. Mobile (`civil-mobile/`)

### Libraries

**Jest** — installed

```bash
cd civil-mobile && npx expo install jest-expo jest @types/jest @react-native/jest-preset
```

**React Native Testing Library** — installed (`render` is async in v14)

```bash
cd civil-mobile && npm i -D @testing-library/react-native react-test-renderer@19.2.3
```

**Detox** — not installed yet

```bash
cd civil-mobile && npm i -D detox
```

### Folders

```text
civil-mobile/tests/unit/  ✅
civil-mobile/tests/e2e/   ✅ (empty until Detox)
```

### Scripts

```bash
npm run test:unit
npm run test:e2e    # skipped stub
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

**Test PostgreSQL** — CI service later (not required for current dummy integration)

### Folders

```text
backend/tests/unit/         ✅
backend/tests/integration/  ✅
backend/tests/e2e/          ✅ (empty until E2E)
```

### Scripts

```bash
npm run test:unit
npm run test:integration
npm run test:e2e    # skipped stub
```

---

## 4. Globally (repo root)

Still planned (not installed in this pass):

**Prettier / ESLint / Husky / lint-staged** — see [Formatting & Linting](../[3]%20Decisions/[1]%20Formatting%20%26%20Linting.md)

### Test levels

Unit · Integration · E2E — no separate feature-test category.
