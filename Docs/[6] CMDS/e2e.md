# End-to-End (E2E) Testing Guide

## Backend E2E (Vitest + Test Postgres)

1. **Start the test Postgres DB**

   ```bash
   cd backend
   npm run test:db:up
   ```
   - Spins up Docker Compose from `docker-compose.test.yml` on port `5433`.
   - If the DB is already running, it will be reused for testing.

2. **Run backend E2E tests**

   ```bash
   npm run test:e2e
   ```
   - Target: All E2E test suites using isolated Postgres (never touches local dev/prod DB).
   - If no Docker Postgres is up, will fall back to an embedded/in-memory Postgres.

3. **(Optional) Clean up test database**
   ```bash
   npm run test:db:down
   ```
   - Stops and removes the test Postgres container(s).

---

## Web E2E (Playwright)

1. **Navigate to web app**

   ```bash
   cd civil-web
   ```

2. **Run full E2E test suite**

   ```bash
   npm run test:e2e
   ```
   - Runs Playwright tests headlessly against a fresh Vite server.

3. **(Optional) Interactive test UI**

   ```bash
   npm run test:e2e:ui
   ```
   - Launches the Playwright UI for debugging and stepping through tests interactively.

4. **(First time only) Install test browser**
   ```bash
   npx playwright install chromium
   ```
   - Required once per machine to download Playwright’s bundled test browser.

**Notes:**

- Playwright automatically starts Vite at [`http://127.0.0.1:5173`] (spawning a new server if not already running).
- E2E tests use test accounts and seed data – never production.
- For troubleshooting or CI config, see `civil-web/playwright.config.ts` and `backend/docker-compose.test.yml`.

---
