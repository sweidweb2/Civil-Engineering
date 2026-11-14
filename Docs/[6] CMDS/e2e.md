# End-to-End (E2E) Testing Guide

## Backend E2E (Vitest + Test Postgres)

1. **Run backend E2E tests**

   ```bash
   cd backend
   npm run test:e2e
   ```
   - Target: All E2E test suites using isolated Postgres (never touches local dev/prod/Supabase DB).
   - Uses **embedded-postgres**, auto-started by e2e `globalSetup`. No Docker needed.

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
- For troubleshooting or CI config, see `civil-web/playwright.config.ts`.

---
