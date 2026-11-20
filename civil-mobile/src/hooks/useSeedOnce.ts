import { useEffect, useRef } from 'react'

/**
 * Run `seed` the first time `source` is available, then never again.
 *
 * Use it to fill an edit form from cached remote data: keyed data refetches in the
 * background (invalidation, app foreground), and re-seeding would wipe what the user
 * is typing. Pass a `resetKey` (e.g. the entity id or the active tab) to allow one
 * new seed when it changes.
 */
export function useSeedOnce<S>(
  source: S | null | undefined,
  seed: (source: S) => void,
  resetKey?: unknown,
) {
  const seededFor = useRef<{ key: unknown } | null>(null)
  const seedRef = useRef(seed)

  useEffect(() => {
    seedRef.current = seed
  })

  useEffect(() => {
    if (source == null) return
    if (seededFor.current && Object.is(seededFor.current.key, resetKey)) return
    seededFor.current = { key: resetKey }
    seedRef.current(source)
  }, [source, resetKey])
}
