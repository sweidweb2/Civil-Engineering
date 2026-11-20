# Mobile caching plan

**Status:** Planned, not started
**Date:** 2026-11-20
**Applies to:** `civil-mobile/` (plus small backend changes, marked **[backend]**)
**Source:** caching audit of commit `8ef146a`

This plan picks the parts of the caching audit that fit this app and orders them into phases. Work through the phases top to bottom. Each phase can ship on its own and leaves the app better than before.

---

## How this app caches today (read this first)

| Piece                       | Where                                                                                                                   | What it does                                                                                                                     |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| In-memory response cache    | `src/lib/remoteCache.ts`                                                                                                | A `Map` of `key → { data, expiresAt }`. 30s lifetime. Expired entries are removed only when read. No size cap.                   |
| Fetch hook                  | `src/hooks/useRemoteData.ts`                                                                                            | Uses the cache when a `cacheKey` is given. A fresh hit skips the network. An expired hit shows a loading skeleton and refetches. |
| Key prefixes + invalidation | `src/lib/cacheKeys.ts`                                                                                                  | Named prefixes (`listings:mine`, `projects:list`…) and helpers such as `invalidateListingCaches()` that mutations call.          |
| Paged lists                 | `usePagedList` in `src/features/worker/ui/list.tsx`, plus custom list hooks in listings, projects and directory screens | One cache entry per page/search/filter.                                                                                          |
| Session                     | `src/stores/authStore.ts` → SecureStore                                                                                 | `user` + `tokens` persisted. The cache is cleared on login, logout and session expiry.                                           |
| Images                      | `expo-image` defaults                                                                                                   | Cached by full URL. URLs are presigned per request (10 min TTL), so the URL changes every fetch.                                 |
| Offline                     | none                                                                                                                    | No connectivity detection, no disk cache of data, no write queue.                                                                |

## Decisions this plan follows

- **No server-state library yet.** Bedrock (`Docs/[1] Main App/[2] Bedrock Checklist.md` §9/§13) defers TanStack Query "until a cache lib is justified". This plan extends `remoteCache` + `useRemoteData` instead. Phase 5 is where that question comes back.
- **Zustand is not an API cache** (`Docs/[3] Decisions/[5] Client State (Zustand).md`). Never put API payloads in a store.
- **No server cache.** Redis was removed (`Docs/[3] Decisions/[8] Redis.md`). Nothing in this plan adds one.
- **Private files stay presigned** (`Docs/[3] Decisions/[10] Storage (Cloudflare R2).md`: public CDN deferred, no public URLs for private files). Images get stable client cache keys rather than a public bucket.

## Not doing (and why)

| Idea from the audit                          | Why not                                                                                                                            |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Backend response caching (Redis, in-process) | Removed by decision. Reads are not a measured problem.                                                                             |
| Public R2 URLs for all images                | Conflicts with the R2 decision for private project/user files. Phase 3 solves the re-download problem without it.                  |
| SQLite / local database                      | No offline product requirement yet. Too much sync complexity for the value.                                                        |
| Offline write queue                          | Approvals, verification, pricing and stage edits must not be replayed later against changed server state. Writes stay online-only. |
| Switching to TanStack Query now              | Phases 1–2 cover the gaps in about 150 lines. Revisit only at Phase 5.                                                             |

---

## Phase 0: Bug fixes (no new architecture)

**Status:** Done (2026-11-20). `usePagedList` now lives in `src/features/worker/ui/usePagedList.ts` (re-exported from `list.tsx`) so it can be unit-tested; see `tests/unit/usePagedList.test.tsx`. Own-account saves use the new `invalidateOwnAccountCaches()`.

**Goal:** fix the confirmed bugs that users can see today.

### 0.1 Paged-list reload empties the list

- **Problem:** `usePagedList().reload()` calls `restart({})`. On page 1 that clears `rows` but the cache key and `load` do not change, so nothing refetches and the empty state shows.
- **Evidence:** `src/features/worker/ui/list.tsx` (`restart`, `reload`, the `empty` render condition).
- **Affected:** `AdminQueueScreen`, `AdminReviewsScreen`, `AdminVerificationsScreen` (after approve / moderate / verify).
- **Steps:**
  - [x] In `reload`, when `page === 1`, call `remote.refetch()` (the caller has already invalidated the cache) instead of only clearing rows.
  - [x] Keep the current behaviour for page > 1 (reset to page 1).
  - [x] Add a unit test: reload on page 1 triggers a fetch and keeps or refreshes the rows.
- **Done when:** approving one of several pending sign-ups leaves the others visible.

### 0.2 Invalidation gaps

- [x] `src/features/account/AccountForms.tsx` (own profile save): also invalidate `cacheKeys.users` and `cacheKeys.directory`.
- [x] `src/features/worker/useWorkerProfile.ts` (`invalidateWorkerCaches`): also invalidate `cacheKeys.directory` (visibility and CV show in the directory).
- [x] `invalidateProviderProfileCaches` in `src/lib/cacheKeys.ts`: also invalidate `cacheKeys.providersPicker` and `cacheKeys.directory`.
- [x] `invalidateListingCaches`: also invalidate `cacheKeys.categories` and `cacheKeys.providers` (both show listing counts).

### 0.3 Remove dead code

- [x] Delete `src/hooks/useResourceList.ts` and `src/hooks/useListState.ts` (not imported anywhere) and their exports in `src/hooks/index.ts`.

---

## Phase 1: Make the cache reliable

**Goal:** invalidation reaches screens that are already open, and one user's data can never land in another user's cache. All changes stay inside `remoteCache.ts` and `useRemoteData.ts`.

### 1.1 Invalidation notifies open screens (most important)

- **Problem:** stack screens stay mounted under detail/edit screens. `remoteCacheInvalidate` only deletes entries, so an open list or dashboard keeps showing old data after an edit, delete or approval until pull-to-refresh.
- **Example:** provider Listings → detail → edit price → back: the list still shows the old price.
- **Steps:**
  - [ ] Add a listener set to `remoteCache.ts`: `remoteCacheSubscribe(fn)`. `remoteCacheInvalidate(prefix)` notifies listeners with the cleared prefix (or "all").
  - [ ] In `useRemoteData`, subscribe while mounted. If the invalidated prefix matches this hook's `cacheKey`, refetch in the background, keeping the current data on screen.
  - [ ] Hooks without a `cacheKey` (detail screens) are unaffected.
  - [ ] Remove the manual focus workaround in `src/features/pm/PmProjectScreen.tsx` (`useFocusEffect` → `stagesRemote.refetch`) once stages use a keyed cache (see 2.4).
- **Done when:** editing a listing, project, user or provider and going back shows the new values with no pull-to-refresh.

### 1.2 Session guard on cache writes

- **Problem:** `useRemoteData` writes to the cache if _any_ token exists. A request started by user A that finishes after B logs in on the same device is cached under a shared key (`providers:me`, `dashboard:admin`…), so B could see A's data for up to 30s.
- **Steps:**
  - [ ] Add a `sessionGeneration` counter in `remoteCache.ts`. `remoteCacheInvalidate()` with no argument (already called by login, logout and clearSession) bumps it.
  - [ ] `useRemoteData.refetch` captures the generation before the request and skips both `setState` and the cache write if it changed.
  - [ ] Unit test: invalidate-all during an in-flight load → result not cached.

### 1.3 Share identical in-flight requests

- [ ] Keep a `Map<key, Promise>` of in-flight loads in `remoteCache.ts`. A second hook with the same key reuses the promise. Example: `dashboard:admin` is used by both Admin Home and Admin More.
- [ ] Clear the entry on settle and on invalidate.

### 1.4 Bound the memory cache

- [ ] Cap entries (about 200). On write, evict the oldest (Map insertion order is enough for LRU: delete and re-set on read).
- [ ] On write, also sweep expired entries (search typing creates many short-lived keys).

---

## Phase 2: Freshness without loading flashes

**Goal:** screens open instantly from cache and refresh quietly; reference data stops refetching every 30s.

### 2.1 Stale-while-revalidate

- **Problem:** when an entry expires, `remoteCacheGet` deletes it and the screen shows a skeleton again.
- **Steps:**
  - [ ] Store `freshUntil` (current 30s) and a longer `keepUntil` (about 10 min) per entry.
  - [ ] Fresh → use it with no request (as today). Stale but kept → show it and refetch in the background (`isFetching` true, no skeleton). Past `keepUntil` → drop.
  - [ ] Session clear still wipes everything (Phase 1.2 rules unchanged).

### 2.2 Per-key lifetimes

| Data                                    | Fresh for   | Why                                            |
| --------------------------------------- | ----------- | ---------------------------------------------- |
| Lists, dashboards, detail               | 30s (today) | Changes often, invalidated by mutations        |
| Category pickers (`categories:picker*`) | 15 min      | Changes rarely; admin edits already invalidate |
| Provider picker (`providers:picker`)    | 5 min       | Admin-only, invalidated on provider changes    |
| `workers:me`, `providers:me`            | 30s         | Own data, invalidated on save                  |

- [ ] Pass `staleTime` from the call sites in `useListingEditor.ts`, `useWorkerCategories.ts`, and the provider picker loader.

### 2.3 Refresh on app foreground

- [ ] Add one `AppState` listener (for example in `src/app/_layout.tsx` or a small `useAppForeground` hook). On `background → active`, mark all entries stale (not deleted) and notify mounted hooks (reuse 1.1) so visible screens refresh quietly.
- [ ] Throttle to at most once per 30s to save battery.

### 2.4 Cache detail screens per id

- [ ] Add keys `projects:detail:<id>`, `projects:stages:<id>`, `listings:detail:<id>` in `PmProjectScreen`, `PmStagesScreen`, `ProviderListingDetailScreen` and `useListingEditor`. They already sit under the prefixes that `invalidateProjectCaches` / `invalidateListingCaches` clear.
- [ ] Opening Stages then no longer refetches the project the detail screen just loaded.

### 2.5 Tell users when a refresh failed

- **Problem:** if a background refetch fails, old data is kept and nothing is shown (`useRemoteData` catch branch).
- [ ] Expose `refreshError` from `useRemoteData`. On pull-to-refresh failure, show the existing error toast. Do not show a toast for silent background refreshes.

### 2.6 Smaller fixes

- [ ] `useWorkerProfile.saveMerged`: replace `refetch({ fresh: true })` with a background refetch so saving does not flash a skeleton.

---

## Phase 3: Images

**Goal:** stop re-downloading full-size images on every list load while keeping presigned URLs.

- **Problem:** URLs are presigned per request (new signature each time), and `expo-image` caches by URL, so the disk cache never hits. Uploads are 1920px wide (`src/lib/optimizeImage.ts`), and lists draw them at 44–76px.

### 3.1 Stable cache keys (mobile only, for galleries)

- [ ] Gallery images already return `storagePath` (`src/services/galleryImages.ts`). Pass `source={{ uri: url, cacheKey: storagePath }}` in `GalleryCard`, `GalleryImagesField` and the listing detail gallery.
- [ ] Set `cachePolicy="memory-disk"` explicitly, and `recyclingKey` on list rows (only `PmDirectoryScreen` has one today).

### 3.2 Stable keys for main images, logos, avatars [backend]

- [ ] Return a stable key next to each resolved URL: `mainImageKey` (listings, projects), `logoKey` (providers), `avatarKey` (profiles). Use the storage path or the file id; never a signed URL.
- [ ] Mobile: use it as `cacheKey` everywhere those images render (`WkMedia` in `src/features/worker/ui/list.tsx`, `src/components/kit/primitives.tsx`, dashboards, `PmDirectoryScreen`, `ProviderProfileScreen`).
- [ ] When an image is replaced, the key changes (new path/file id), so the old cache entry is simply never used again.

### 3.3 Thumbnails (optional, later) [backend]

- [ ] Generate a small variant (about 320px) on upload and return it for list views. This needs an R2 key convention update, so write a short decision note first.

**Done when:** opening a list a second time loads images from disk (check with the network inspector: no image requests on the second visit).

---

## Phase 4: Session freshness and API hygiene

### 4.1 Refresh the saved user

- **Problem:** the persisted `user` (role, status, verification, names) is never re-read. If an admin changes a role or suspends someone, the app keeps routing to the old portal until 403s force a logout.
- [ ] After hydration (when tokens exist), call the existing `GET /users/:id` for the current user (already used by `AccountForms`) and update `useAuthStore` `user`. If the role changed, routing follows automatically through `RequireAuth`.
- [ ] Repeat on app foreground (reuse the 2.3 listener, throttled).
- [ ] Optional [backend]: add `GET /auth/me` later if `/users/:id` returns more than needed.

### 4.2 Hydration gate

- **Problem:** on native, `window` exists, so the microtask in `src/stores/authStore.ts` sets `isHydrated = true` before SecureStore finishes reading. `src/app/index.tsx` also forces it after 50ms. This can flash the login screen on a cold start (unverified on device).
- [ ] Keep the microtask fallback for web only (`Platform.OS === 'web'`). On native, rely on `onRehydrateStorage`.
- [ ] Verify on a device with a saved session: launch goes straight to the portal.

### 4.3 No HTTP caching of API responses [backend]

- [ ] Send `Cache-Control: no-store` on `/api/v1/*` (authenticated, per-user data). Disable Express `etag` since no client uses conditional requests.
- **Why:** removes any doubt about OS-level HTTP caches reusing one user's response for another (same URL, different token).

---

## Phase 5: Offline reading (optional, needs a decision first)

Only start this if the product needs it, for example PMs checking projects on site with poor signal.

- [ ] Write `Docs/[3] Decisions/[14] Mobile Offline Read Cache.md` first. Decide whether to keep the custom hook or adopt TanStack Query + a persister (this is the "justified" point Bedrock mentions).
- [ ] Scope: **read-only** snapshots of the user's own data: dashboard, `workers:me` / `providers:me`, page 1 of my projects / my listings. Persist with a per-user, versioned key, cleared on logout.
- [ ] Detect connectivity (`expo-network`) and show an "Offline, showing saved data from <time>" banner.
- [ ] Writes stay online-only. Disable save buttons while offline.
- [ ] Add an `Idempotency-Key` header on create calls (listings, projects, users) so a retry after a timeout does not create duplicates [backend support needed].

---

## Tracking

| Phase | Scope                                                         | Size | Needs backend | Status |
| ----- | ------------------------------------------------------------- | ---- | ------------- | ------ |
| 0     | Reload bug, invalidation gaps, dead code                      | S    | No            | ☑ Done |
| 1     | Notify open screens, session guard, dedup, cap                | M    | No            | ☐      |
| 2     | Stale-while-revalidate, TTLs, foreground refresh, detail keys | M    | No            | ☐      |
| 3     | Image cache keys (3.1 mobile; 3.2–3.3 backend)                | S–M  | 3.2, 3.3      | ☐      |
| 4     | Refresh user, hydration gate, `no-store`                      | S    | 4.3           | ☐      |
| 5     | Offline read cache (optional)                                 | L    | Idempotency   | ☐      |

Each phase: add unit tests next to `tests/unit/remoteCache.test.ts` and run `npm run typecheck && npm run lint && npm test` in `civil-mobile/`.
