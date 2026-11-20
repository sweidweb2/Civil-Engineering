/**
 * In-memory API response cache shared across screens (see docs/caching-plan.md).
 *
 * - Each entry is **fresh** for `staleMs` (default 30s): reused with no request.
 *   After that it is **stale but kept** until `keepUntil` (default 5 min): screens
 *   show it instantly and refetch in the background (stale-while-revalidate).
 *   The keep window stays under the 10-min presigned image URL lifetime so stale
 *   payloads never carry expired image links.
 * - Entries are capped (LRU) and swept on write, so search keystrokes cannot grow
 *   the map without bound.
 * - `remoteCacheInvalidate(prefix)` drops matching entries and notifies mounted
 *   subscribers (`useRemoteData`) so open screens refetch.
 * - `remoteCacheInvalidate()` (no prefix: login / logout / session expiry) wipes
 *   everything and bumps the session generation, so responses that started under
 *   the previous session are never cached.
 * - `remoteCacheRevalidate()` (app back in foreground) asks mounted subscribers
 *   to refetch if their entry is no longer fresh.
 * - `remoteCacheFetch` shares one in-flight request per key.
 */

type CacheEntry = {
  data: unknown
  freshUntil: number
  keepUntil: number
}

type InFlight = {
  promise: Promise<unknown>
  generation: number
  /** Set when the key is invalidated mid-flight: the result predates the mutation. */
  invalidated: boolean
}

/** `invalidate`: entries under `prefix` were dropped. `revalidate`: refetch if not fresh. */
export type RemoteCacheEvent = { type: 'invalidate'; prefix: string } | { type: 'revalidate' }

/** Not called for a full wipe (session change). */
export type RemoteCacheListener = (event: RemoteCacheEvent) => void

const DEFAULT_STALE_MS = 30_000
/** How long a stale entry may still be shown while it revalidates. */
export const REMOTE_KEEP_MS = 5 * 60_000
/** Max cached responses; least-recently-used are evicted first. */
export const REMOTE_CACHE_MAX_ENTRIES = 200

const store = new Map<string, CacheEntry>()
const inFlight = new Map<string, InFlight>()
const listeners = new Set<RemoteCacheListener>()
let sessionGeneration = 0

/** True when `key` is `prefix` or starts with it (same rule as invalidation). */
export function remoteCacheKeyMatches(key: string, prefix: string) {
  return key === prefix || key.startsWith(prefix)
}

/**
 * Read a cached payload that is still within its keep window, with whether it is
 * still fresh. A hit counts as a use for LRU.
 */
export function remoteCacheRead<T>(key: string): { data: T; fresh: boolean } | undefined {
  const entry = store.get(key)
  if (!entry) return undefined
  const now = Date.now()
  if (now > entry.keepUntil) {
    store.delete(key)
    return undefined
  }
  // Map keeps insertion order: re-insert so this key becomes most recent.
  store.delete(key)
  store.set(key, entry)
  return { data: entry.data as T, fresh: now <= entry.freshUntil }
}

/** Read a still-**fresh** cached payload, if any. */
export function remoteCacheGet<T>(key: string): T | undefined {
  const hit = remoteCacheRead<T>(key)
  return hit?.fresh ? hit.data : undefined
}

function sweepExpired(now: number) {
  for (const [key, entry] of store) {
    if (now > entry.keepUntil) store.delete(key)
  }
}

/** Store a payload for cross-screen reuse (fresh for `staleMs`, kept for at least 5 min). */
export function remoteCacheSet(key: string, data: unknown, staleMs = DEFAULT_STALE_MS) {
  const now = Date.now()
  sweepExpired(now)
  store.delete(key)
  store.set(key, {
    data,
    freshUntil: now + staleMs,
    keepUntil: now + Math.max(staleMs, REMOTE_KEEP_MS),
  })
  while (store.size > REMOTE_CACHE_MAX_ENTRIES) {
    const oldest = store.keys().next().value
    if (oldest === undefined) break
    store.delete(oldest)
  }
}

function emit(event: RemoteCacheEvent) {
  for (const listener of [...listeners]) listener(event)
}

/**
 * Drop the whole cache, or one exact key plus every key that starts with the
 * given prefix (`listings:mine` clears both a bare key and `listings:mine:1::`).
 */
export function remoteCacheInvalidate(keyOrPrefix?: string) {
  if (!keyOrPrefix) {
    store.clear()
    inFlight.clear()
    sessionGeneration += 1
    return
  }
  for (const key of [...store.keys()]) {
    if (remoteCacheKeyMatches(key, keyOrPrefix)) store.delete(key)
  }
  for (const [key, request] of inFlight) {
    if (remoteCacheKeyMatches(key, keyOrPrefix)) {
      request.invalidated = true
      inFlight.delete(key)
    }
  }
  emit({ type: 'invalidate', prefix: keyOrPrefix })
}

/** Ask mounted screens to refetch any data that is no longer fresh (app foreground). */
export function remoteCacheRevalidate() {
  emit({ type: 'revalidate' })
}

/** Listen for invalidate / revalidate events; returns an unsubscribe function. */
export function remoteCacheSubscribe(listener: RemoteCacheListener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Changes on every full wipe (login / logout / session expiry). */
export function remoteCacheGeneration() {
  return sessionGeneration
}

/**
 * Load `key` through the cache's request layer: concurrent callers share one
 * request, and the result is cached only if the session and key were not
 * invalidated while it was in flight (and `shouldStore` allows it).
 */
export function remoteCacheFetch<T>(
  key: string,
  load: () => Promise<T>,
  options: { staleMs?: number; shouldStore?: () => boolean } = {},
): Promise<T> {
  const existing = inFlight.get(key)
  if (existing && existing.generation === sessionGeneration) {
    return existing.promise as Promise<T>
  }

  const request: InFlight = {
    promise: Promise.resolve(),
    generation: sessionGeneration,
    invalidated: false,
  }
  request.promise = load()
    .then((data) => {
      const current = request.generation === sessionGeneration && !request.invalidated
      if (current && (options.shouldStore?.() ?? true)) {
        remoteCacheSet(key, data, options.staleMs)
      }
      return data
    })
    .finally(() => {
      if (inFlight.get(key) === request) inFlight.delete(key)
    })
  inFlight.set(key, request)
  return request.promise as Promise<T>
}

export const REMOTE_STALE_MS = DEFAULT_STALE_MS
