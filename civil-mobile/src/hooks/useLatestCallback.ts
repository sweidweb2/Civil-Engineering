import { useCallback, useInsertionEffect, useRef } from 'react'

/**
 * A function with a stable identity that always calls the latest `fn`. Use it for
 * handlers captured by memoized list rows (`useCallback` renderers), so a handler that
 * closes over fresh state (e.g. `list.reload`) does not re-render every row on each
 * parent render. Call it from events and effects only, never during render.
 */
export function useLatestCallback<Args extends unknown[], Result>(
  fn: (...args: Args) => Result,
): (...args: Args) => Result {
  const ref = useRef(fn)
  useInsertionEffect(() => {
    ref.current = fn
  })
  return useCallback((...args: Args) => ref.current(...args), [])
}
