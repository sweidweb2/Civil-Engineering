# Mobile E2E (Detox)

Detox is installed and configured for **Android emulator**.

## Prerequisites

1. Android Studio + emulator AVD named `Pixel_7_API_34` (or change `.detoxrc.js`)
2. Generate native project once: `npx expo prebuild --platform android`
3. Start emulator

## Commands

```bash
npm run test:e2e:build   # build debug APK + androidTest
npm run test:e2e         # run tests/e2e/*.e2e.ts
```

iOS Detox requires macOS — not configured on this Windows workspace.
