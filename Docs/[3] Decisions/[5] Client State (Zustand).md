# Decision — Client State (Zustand)

**Status:** LOCKED  
**Date:** 2026-09-20  
**Applies to:** `civil-web/`, `civil-mobile/`

Server-state / API cache library remains deferred (see Bedrock §9 / §13). This decision covers **client/UI state only**.

---

## Adopted

| App    | Library   | First store                            |
| ------ | --------- | -------------------------------------- |
| Web    | Zustand 5 | `civil-web/src/stores/authStore.ts`    |
| Mobile | Zustand 5 | `civil-mobile/src/stores/authStore.ts` |

Default to **local/component state**. Promote to Zustand only when multiple distant screens/components need the same **client** state.

---

## What belongs in Zustand

- Auth session flags + current user summary needed for routing/UI (`user`, tokens, `isHydrated`)
- Cross-screen UI preferences (theme preference, sidebar collapsed — when product needs them)
- Multi-step wizard drafts that must survive navigation within the app
- Ephemeral UI shared across distant consumers (e.g. global command palette open)

## What must NOT go in Zustand

- API list/detail payloads used as a cache (projects, expenses, workers, …)
- Loading / error flags for individual fetches (keep beside the feature / `useRemoteData`)
- Form field state for a single screen (local state + Zod)
- Authorization decisions as a security boundary (backend authz is authority; UI role checks are UX only)
- Anything that makes Zustand a second database

**Rule locked:** Zustand ≠ API cache / database.

---

## Store structure / naming

```text
src/stores/
  <domain>Store.ts     # one client domain per file
  index.ts             # re-exports public hooks
  # mobile auth only:
  authStorage.ts       # SecureStore adapter
  authStorage.web.ts   # localStorage adapter for Expo web
```

| Concern     | Convention             | Example                               |
| ----------- | ---------------------- | ------------------------------------- |
| File        | `<domain>Store.ts`     | `authStore.ts`                        |
| Hook export | `use<Domain>Store`     | `useAuthStore`                        |
| State type  | `<Domain>State`        | `AuthState`                           |
| Persist key | `civil-<app>-<domain>` | `civil-web-auth`, `civil-mobile-auth` |
| Actions     | verbs on the store     | `login`, `logout`, `setHydrated`      |

Rules:

1. One store = one client domain; no god-store.
2. Import via `@/stores` or `@/stores/<domain>Store` — features do not create parallel store folders.
3. Stores may call `services/` for session mutations (login/logout); they must not call Prisma/DB.
4. Select narrowly: `useAuthStore((s) => s.user)`, not the whole store object in hot paths.

---

## Persistence rules

| Rule               | Detail                                                                                  |
| ------------------ | --------------------------------------------------------------------------------------- |
| Default            | **Do not persist.** Memory-only unless a product need is explicit.                      |
| Allowed to persist | Auth session (`user` + `tokens`). Future: small UI prefs with an explicit key.          |
| Never persist      | Server entity lists/details, fetch status, `isHydrated`, passwords, one-off form drafts |
| `partialize`       | Required whenever `persist` is used — whitelist only safe fields                        |
| Web storage        | Zustand default `localStorage` for `civil-web` auth                                     |
| Mobile storage     | `expo-secure-store` via `authStorage` (native); `localStorage` on Expo web              |
| Hydration          | Gate protected UI on `isHydrated === true` after rehydrate                              |
| Logout             | Clear in-memory state **and** persisted auth slice                                      |
| Secrets            | Never log tokens; never commit storage dumps                                            |

Server data continues to come from `services/` (+ optional `useRemoteData` / a future cache lib). Do not “fix” API responses into Zustand for convenience.
