# Decision — Mobile Offline Read Cache

**Status:** Accepted
**Date:** 2026-11-21
**Applies to:** `civil-mobile/` (offline reads, connectivity, online-only writes), `backend/` (idempotent creates)
**Related:** [Client State (Zustand)](./[5]%20Client%20State%20%28Zustand%29.md) · [Redis](./[8]%20Redis.md) · [Storage (Cloudflare R2)](./[10]%20Storage%20%28Cloudflare%20R2%29.md) · `civil-mobile/docs/caching-plan.md` (Phase 5)

---

## Context

Project managers and workers use the app on construction sites with weak or no signal. Before this decision the app showed an error on any screen opened offline, and a create that timed out after the server had already saved it could be submitted twice.

The Bedrock checklist defers a server-state library "until a cache lib is justified". Phases 0–4 of the caching plan already gave the custom `remoteCache` + `useRemoteData` layer the features such a library would bring (subscriptions, deduplication, stale-while-revalidate, foreground refresh, session guards).

## Decision

### 1. Keep the custom cache; add a read-only disk fallback

- **No TanStack Query.** Offline reads are a ~150-line extension of `useRemoteData` (`src/lib/offlineSnapshot.ts`). The deferral in Bedrock stands.
- Successful responses for an **allow-list** of keys are saved to disk. They are read **only as a fallback**: when a request fails with a network error (no server response) and nothing is on screen. Online behaviour does not change.
- Screens showing a saved copy get `offlineSavedAt` from `useRemoteData`; a global banner says the app is offline.

### 2. What is saved (allow-list)

Only the signed-in user's own working data: dashboards, own profile / CV, own projects (detail + stages), page 1 of own project and listing lists (no search), own listing detail, PM directory page 1.

**Not saved:** admin lists of other people (users, sign-ups, verifications, reviews), searches, later pages, edit forms.

### 3. Storage, limits, privacy

| Rule                         | Detail                                                                                                                                                                 |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Where                        | `expo-file-system` `Paths.cache`, one JSON file per user (`offline-snapshot-v1-<userId>.json`). OS cache dir: excluded from backups, may be purged — fine for a cache. |
| Not in Zustand / SecureStore | Zustand ≠ API cache (decision [5]); SecureStore is for secrets and small values.                                                                                       |
| Limits                       | ≤ 40 entries, each ≤ 7 days old; writes batched (1.5s).                                                                                                                |
| Privacy                      | Deleted on logout, session expiry and login. Other users' data never read (file and entries keyed by user id).                                                         |
| Images                       | Not stored by this layer. Presigned URLs inside saved payloads expire, but images load from expo-image's disk cache via stable cache keys (caching plan Phase 3).      |
| Web                          | Disabled (no file system; civil-web is the web client).                                                                                                                |
| Versioning                   | `version` field in the file; a mismatch or corrupt file is treated as empty.                                                                                           |

### 4. Writes stay online-only

- **No write queue.** Approvals, verification, pricing and stage edits must not be replayed later against changed server state.
- Connectivity comes from `expo-network`. "Offline" means `isConnected === false` only; `isInternetReachable` is ignored (it mirrors `isConnected` on iOS and flickers on Android, and a false "offline" would block saves).
- While offline, `apiRequest` fails non-GET calls immediately with `ApiError` code `OFFLINE` and a localized message, shown by the existing error handling. No per-screen button changes are needed.
- When the connection returns, open screens revalidate (`remoteCacheRevalidate`).

### 5. Idempotent creates

- Clients send an optional `Idempotency-Key` header on `POST /listings`, `POST /projects` and `POST /users`. Mobile reuses the key while the submitted body is unchanged (`useIdempotencyKey`), so a retry after a timeout replays the stored result instead of creating a duplicate.
- Backend middleware `backend/src/middleware/idempotency.ts`:
  - scope = user id + method + route + key;
  - 2xx responses replayed for 24h (`Idempotent-Replayed: true`);
  - errors are not stored, so a corrected retry is processed normally;
  - same key with a different body → `409 IDEMPOTENCY_KEY_REUSED`;
  - concurrent duplicate → `409 IDEMPOTENCY_IN_PROGRESS`.
- **In-process memory** (bounded LRU, 10k entries), like the rate limiter. This respects [Redis](./[8]%20Redis.md): no shared store. Keys are per process and lost on restart, which is acceptable for the single-instance deployment.

## Consequences

- Opening a screen offline shows the last saved copy instead of an error, for the allow-listed data.
- Saving offline gives an immediate, clear message instead of a 30s timeout.
- Personal data now persists on the device (app sandbox, cache dir) until logout or 7 days.
- With multiple API instances, idempotency keys would not be shared: a retry routed to another instance could still duplicate. Moving to a shared store needs a new decision.

## Revisit when

- Offline **writes** become a product requirement (needs a queue, conflict rules, and per-action decisions).
- The API runs on more than one instance (shared idempotency store).
- The custom cache grows past what is reasonable to maintain. TanStack Query + a persister is the fallback option.
