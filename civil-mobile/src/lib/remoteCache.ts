type CacheEntry = {
  data: unknown
  expiresAt: number
}

const store = new Map<string, CacheEntry>()

const DEFAULT_STALE_MS = 30_000

/** Read a still-fresh cached payload, if any. */
export function remoteCacheGet<T>(key: string): T | undefined {
  const entry = store.get(key)
  if (!entry) return undefined
  if (Date.now() > entry.expiresAt) {
    store.delete(key)
    return undefined
  }
  return entry.data as T
}

/** Store a payload for cross-screen reuse (default 30s, matching civil-web). */
export function remoteCacheSet(key: string, data: unknown, staleMs = DEFAULT_STALE_MS) {
  store.set(key, { data, expiresAt: Date.now() + staleMs })
}

/**
 * Drop the whole cache, one exact key, and every key that starts with the
 * given prefix. Exact + prefix always both apply so `listings:mine` clears
 * both a bare key and `listings:mine:1::` pages.
 */
export function remoteCacheInvalidate(keyOrPrefix?: string) {
  if (!keyOrPrefix) {
    store.clear()
    return
  }
  store.delete(keyOrPrefix)
  for (const key of [...store.keys()]) {
    if (key.startsWith(keyOrPrefix)) store.delete(key)
  }
}

export const REMOTE_STALE_MS = DEFAULT_STALE_MS
