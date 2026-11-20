import { useCallback, useEffect, useRef, useState } from 'react'

import {
  REMOTE_STALE_MS,
  remoteCacheFetch,
  remoteCacheGeneration,
  remoteCacheGet,
  remoteCacheKeyMatches,
  remoteCacheRead,
  remoteCacheSubscribe,
} from '@/lib/remoteCache'
import { useAuthStore } from '@/stores/authStore'

export type RemoteIdle = { status: 'idle' }
export type RemoteLoading = { status: 'loading' }
export type RemoteSuccess<T> = { status: 'success'; data: T }
export type RemoteError = { status: 'error'; error: unknown }

export type RemoteState<T> = RemoteIdle | RemoteLoading | RemoteSuccess<T> | RemoteError

type UseRemoteDataOptions = {
  /** When false, skip the initial fetch. Default true. */
  enabled?: boolean
  /**
   * Stable cache key (e.g. `providers:me`, `projects:list:1::`). A fresh entry is
   * reused with no request; a stale (kept) entry is shown instantly while a
   * background request refreshes it.
   */
  cacheKey?: string
  /** How long a successful result stays fresh. Default 30s. */
  staleTime?: number
}

type RefetchOptions = {
  /** Drop cached/current data and show the initial loading state. */
  fresh?: boolean
}

/**
 * Lightweight server-data fetch for a screen/feature.
 * Keeps loading/error/data local — do not dump results into Zustand.
 * Same-key refetch keeps the previous success payload (pull-to-refresh).
 * A changed `cacheKey` drops previous rows unless the cache has that key.
 * In-flight responses are ignored once a newer request (or key) supersedes them.
 *
 * Keyed hooks share in-flight requests with other screens using the same key, and
 * refetch in the background (keeping current data) when their key is invalidated
 * or when the app returns to the foreground with stale data — so screens left
 * open under a stack see edits made elsewhere.
 *
 * `refetch()` resolves `false` only when the request failed while previous data was
 * kept on screen (a silent refresh failure the caller may want to report — see
 * `usePullToRefresh`); otherwise `true`.
 */
export function useRemoteData<T>(load: () => Promise<T>, options: UseRemoteDataOptions = {}) {
  const { enabled = true, cacheKey, staleTime = REMOTE_STALE_MS } = options
  const cached = cacheKey ? remoteCacheRead<T>(cacheKey) : undefined
  const [state, setState] = useState<RemoteState<T>>(() =>
    cached !== undefined ? { status: 'success', data: cached.data } : { status: 'idle' },
  )
  const [isFetching, setIsFetching] = useState(false)
  const loadRef = useRef(load)
  const cacheKeyRef = useRef(cacheKey)
  const staleTimeRef = useRef(staleTime)
  const stateRef = useRef(state)
  /** Cache key that `state` currently belongs to (prevents cross-page hadData). */
  const dataKeyRef = useRef<string | undefined>(cached !== undefined ? cacheKey : undefined)
  const requestIdRef = useRef(0)

  useEffect(() => {
    loadRef.current = load
  }, [load])

  useEffect(() => {
    cacheKeyRef.current = cacheKey
    staleTimeRef.current = staleTime
  }, [cacheKey, staleTime])

  useEffect(() => {
    stateRef.current = state
  }, [state])

  const show = useCallback((next: RemoteState<T>) => {
    // Keep the ref in step so a refetch started in the same commit sees this state.
    stateRef.current = next
    setState(next)
  }, [])

  // Key/load change: seed from cache (fresh or stale), or clear previous rows and
  // abandon in-flight work. `load` is included so uncached screens (no cacheKey)
  // don't keep the prior entity's data.
  useEffect(() => {
    requestIdRef.current += 1
    const hit = cacheKey ? remoteCacheRead<T>(cacheKey) : undefined
    if (hit !== undefined) {
      dataKeyRef.current = cacheKey
      show({ status: 'success', data: hit.data })
      setIsFetching(false)
      return
    }
    dataKeyRef.current = undefined
    show(enabled ? { status: 'loading' } : { status: 'idle' })
  }, [cacheKey, enabled, load, show])

  const refetch = useCallback(
    async (refetchOptions?: RefetchOptions): Promise<boolean> => {
      const fresh = refetchOptions?.fresh === true
      const requestId = ++requestIdRef.current
      const requestKey = cacheKeyRef.current
      const hadData =
        !fresh && stateRef.current.status === 'success' && dataKeyRef.current === requestKey
          ? (stateRef.current as RemoteSuccess<T>).data
          : undefined

      if (fresh || hadData === undefined) {
        show({ status: 'loading' })
      }
      setIsFetching(true)
      // A login / logout / session expiry in the meantime makes this result belong to
      // another session: never show or cache it.
      const generation = remoteCacheGeneration()
      try {
        const data = requestKey
          ? await remoteCacheFetch(requestKey, () => loadRef.current(), {
              staleMs: staleTimeRef.current,
              shouldStore: () => Boolean(useAuthStore.getState().tokens),
            })
          : await loadRef.current()
        if (requestId !== requestIdRef.current) return true
        if (generation !== remoteCacheGeneration()) return true
        dataKeyRef.current = requestKey
        show({ status: 'success', data })
        return true
      } catch (error) {
        if (requestId !== requestIdRef.current) return true
        if (generation !== remoteCacheGeneration()) return true
        if (hadData !== undefined) {
          show({ status: 'success', data: hadData })
          return false
        }
        dataKeyRef.current = undefined
        show({ status: 'error', error })
        return true
      } finally {
        if (requestId === requestIdRef.current) setIsFetching(false)
      }
    },
    [show],
  )

  // Invalidation of this key (or a prefix of it) elsewhere → background refetch.
  // App back in foreground → refetch only if this key is no longer fresh.
  // refetch() keeps the current data on screen, so there is no skeleton flash.
  useEffect(() => {
    if (!enabled || !cacheKey) return
    return remoteCacheSubscribe((event) => {
      if (event.type === 'invalidate') {
        if (remoteCacheKeyMatches(cacheKey, event.prefix)) void refetch()
      } else if (remoteCacheGet<T>(cacheKey) === undefined) {
        void refetch()
      }
    })
  }, [enabled, cacheKey, refetch])

  useEffect(() => {
    if (!enabled) return
    // Fresh cache hit: show it and skip the network until stale / invalidate / refetch.
    // Stale hit: already shown by the key effect; refetch() revalidates in the background.
    if (cacheKey && remoteCacheGet<T>(cacheKey) !== undefined) return
    void refetch()
  }, [enabled, refetch, load, cacheKey])

  const hasData = state.status === 'success'
  const isError = state.status === 'error'

  return {
    ...state,
    refetch,
    /** True while a request is in flight (including background refresh). */
    isFetching,
    /** True only when there is nothing to show yet. */
    isLoading:
      (!hasData && !isError && (state.status === 'loading' || state.status === 'idle')) ||
      (isFetching && !hasData && !isError),
    isError,
    isSuccess: hasData,
  }
}
