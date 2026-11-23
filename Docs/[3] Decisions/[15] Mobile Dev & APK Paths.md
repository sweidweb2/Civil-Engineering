# Notes — Mobile: live preview vs APK (EAS)

**Status:** REFERENCE (how we run/ship `civil-mobile` today)  
**Date:** 2026-11-21  
**Applies to:** `civil-mobile/`, Expo / EAS  
**Related:** [Mobile Client Unparked](./[13]%20Mobile%20Client%20Unparked.md), [CI Today & Mobile Release Split](./[12]%20CI%20Today%20%26%20Mobile%20Release%20Split.md)

---

## Two paths (both valid)

| Path                    | What it is                                              | When to use                                       |
| ----------------------- | ------------------------------------------------------- | ------------------------------------------------- |
| **A — Live preview**    | Metro bundler on your PC + **Expo Go** (or a simulator) | Day-to-day coding: fast reload, no cloud build    |
| **B — Installable APK** | **EAS Build** in Expo’s cloud → download/install APK    | Real phone install, share with others, no Expo Go |

You can use **both**. They are not alternatives that replace each other forever.

---

## Path A — Live (local) preview

```bash
cd civil-mobile
npm start          # or: npx expo start
```

- Phone and PC on same network (or tunnel if Expo offers it).
- Open in **Expo Go** by scanning the QR code.
- **SDK must match:** Expo Go on the store is often newer than the project.  
  Example: phone Expo Go = SDK 58, project = SDK 57 → incompatible until you upgrade the project (`npx expo install expo@^58 …`) or use Path B.
- Edits to JS/TS show up after reload — **no EAS rebuild**.
- Phone cannot reach `localhost` for the API unless you point env at a reachable host (LAN IP / staging).

---

## Path B — APK via Expo EAS (cloud)

Already linked Expo project id (in `app.json` → `extra.eas.projectId`):  
`4cc889bd-b1a3-41eb-91d8-88a745dd9ce6` (account/project as configured on expo.dev).

```bash
cd civil-mobile
npx eas-cli@latest login          # once
npx eas-cli@latest build -p android --profile preview
```

- Build runs **in the cloud** (no Android Studio on your machine).
- When finished: open the Expo build URL / QR → **download APK** → install on phone (allow unknown apps if asked).
- Answer **no** to “install on emulator” unless you actually have an emulator.
- This APK embeds the project’s Expo SDK — **no Expo Go needed**.

### After you change the app

| Change type                | What to do                                                    |
| -------------------------- | ------------------------------------------------------------- |
| Want a new installable APK | Run `eas build -p android --profile preview` again, reinstall |
| Day-to-day coding          | Path A (`expo start`) — don’t rebuild APK every save          |
| Later: JS-only OTA         | Possible with **EAS Update** (not set up yet)                 |
| Native / SDK / permissions | Always a new EAS build                                        |

Profiles (see `civil-mobile/eas.json`):

- **preview** — internal distribution (what we use for test APKs)
- **production** — store-oriented (AAB / Play later)
- **development** — dev client (optional; not required for basic APK testing)

---

## What not to confuse

| Thing                               | Role                                                        |
| ----------------------------------- | ----------------------------------------------------------- |
| **Expo Go**                         | Generic host app for Path A only                            |
| **Your APK**                        | Your app binary from Path B                                 |
| **`create-expo-app` / new starter** | Do **not** create a second app — keep using `civil-mobile/` |
| **Codemagic**                       | Not required; EAS covers cloud Android builds for now       |
| **GitHub CI (today)**               | Lint/unit quality — **not** APK shipping yet                |

---

## Later (not done yet)

- Automate Path B with CI: secret `EXPO_TOKEN` + workflow running `eas build` on tag / `main` / manual dispatch (see Decision [12]).
- Play Store: production profile + `eas submit`.
- Optional: EAS Update for OTA JS without full APK each time.
- Optional: upgrade project to match current Expo Go SDK so Path A works on the latest store Expo Go.

---

## Quick cheat sheet

```text
Daily coding     →  cd civil-mobile && npm start     (Expo Go / sim)
Test on phone    →  eas build -p android --profile preview  → install APK
Expo Go mismatch →  upgrade SDK  OR  use APK (Path B)
New APK after edits →  rebuild on EAS (until OTA is set up)
```
