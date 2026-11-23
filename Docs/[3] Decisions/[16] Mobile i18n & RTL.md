# Decision: Mobile i18n & RTL

**Status:** Accepted  
**Date:** 2026-11-23  
**Applies to:** `civil-mobile/` (language, layout direction, typography)  
**Related:** [Mobile Client Unparked](./[13]%20Mobile%20Client%20Unparked.md) · `civil-mobile/SCREEN-MAP.md`

## Context

The mobile app ships English and Arabic. React Native layout direction is controlled by `I18nManager`; Arabic must feel intentionally designed (selective mirroring, LTR isolation for technical tokens), not a globally flipped English UI.

## Decision

1. **Languages:** `en` | `ar` via i18next + Zustand (`languageStore`), persisted in SecureStore. First launch seeds from `expo-localization` when nothing is saved yet. **Auth screens (login / register / pending approval) are always English and LTR**, regardless of the saved language.
2. **Direction:** `I18nManager.allowRTL` / `forceRTL` on native; `document.documentElement.dir` / `lang` on web. Direction flips call `switchAppLanguage` → confirm → `reloadAppAsync()` on native.
3. **Selective icon mirroring:** only directional chevrons/arrows via `flipStyle` / `DirectionalIcon`. Do not mirror search, settings, close, plus, check, eye, logos, or media.
4. **LTR isolation:** emails, phones, URLs, IDs, codes, and numeric amounts use `ltr()` (Unicode isolates) and/or `ltrInputStyle()` on inputs.
5. **Chronological UI:** stage stepper and `SegmentedBar` keep `direction: 'ltr'` so sequence order stays left→right. Bottom tabs follow native RTL reverse.
6. **Typography:** Noto Sans Arabic (Regular / Medium / SemiBold) when Arabic is active; no Latin letter-spacing; slightly taller line heights. Western digits via `ar-u-nu-latn`.
7. **Validation copy:** client Zod schemas are factories `(t) => …` with `validation.*` keys; backend Zod remains the security boundary.

## Consequences

- `app.json` sets `extra.supportsRTL` and Android `supportsRtl`.
- Do not reintroduce unused language pickers; account language UI lives in portal preferences (`WkPreferences`).
- civil-web RTL is out of scope for this decision.
