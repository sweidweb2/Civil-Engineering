import { useCallback, useRef } from 'react'

/** Random key accepted by the API (`[A-Za-z0-9_-]{8,128}`). */
export function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const random = () => Math.random().toString(36).slice(2, 12)
  return `m-${Date.now().toString(36)}-${random()}${random()}`
}

/**
 * One key per *submission*: retrying the same body (after a timeout, say) reuses the
 * key, so the server replays the create it already did instead of duplicating it.
 * Changing the form makes a new key (the server rejects a reused key with a different
 * body).
 */
export function createIdempotencyKeyFor() {
  let last: { body: string; key: string } | null = null
  return (payload: unknown) => {
    const body = JSON.stringify(payload ?? null)
    if (last?.body !== body) last = { body, key: newIdempotencyKey() }
    return last.key
  }
}

/** React wrapper: a stable `keyFor(payload)` for one create screen. */
export function useIdempotencyKey() {
  const keyForRef = useRef<ReturnType<typeof createIdempotencyKeyFor> | null>(null)
  return useCallback((payload: unknown) => {
    keyForRef.current ??= createIdempotencyKeyFor()
    return keyForRef.current(payload)
  }, [])
}
