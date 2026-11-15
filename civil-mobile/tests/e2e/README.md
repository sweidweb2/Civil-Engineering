# Mobile E2E (Detox) — **disabled for now**

Detox deps/config may still exist under the app, but **`npm run test:e2e` / `test:e2e:build` are no-ops**.

CI also skips Detox (`CI_RUN_E2E=false`). Re-enable later when you want emulator e2e in CI/local.

Focus on **`npm run test:unit`** (Jest) until then.
