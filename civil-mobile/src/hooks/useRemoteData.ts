import { useCallback, useEffect, useRef, useState } from 'react'

import { REMOTE_STALE_MS, remoteCacheGet, remoteCacheSet } from '@/lib/remoteCache'

export type RemoteIdle = { status: 'idle' }
export type RemoteLoading = { status: 'loading' }
export type RemoteSuccess<T> = { status: 'success'; data: T }
export type RemoteError = { status: 'error'; error: unknown }

export type RemoteState<T> = RemoteIdle | RemoteLoading | RemoteSuccess<T> | RemoteError

type UseRemoteDataOptions = {
  /** When false, skip the initial fetch. Default true. */
  enabled?: boolean
  /**
   * Stable cache key (e.g. `providers:me`, `projects:list:1::`). Matching keys
   * reuse a fresh in-memory result for `staleTime` ms across screens — no
   * network until the entry expires, is invalidated, or `refetch` is called.
   */
  cacheKey?: string
  /** How long a successful result stays reusable. Default 30s. */
  staleTime?: number
}

type RefetchOptions = {
  /** Drop cached/current data and show the initial loading state. */
  fresh?: boolean
}

/**
 * Lightweight server-data fetch for a screen/feature.
 * Keeps loading/error/data local — do not dump results into Zustand.
 * Refetch keeps the previous success payload on screen (pull-to-refresh style).
 * Optional `cacheKey` shares fresh results across mounts for a short TTL.
 */
export function useRemoteData<T>(load: () => Promise<T>, options: UseRemoteDataOptions = {}) {
  const { enabled = true, cacheKey, staleTime = REMOTE_STALE_MS } = options
  const cached = cacheKey ? remoteCacheGet<T>(cacheKey) : undefined
  const [state, setState] = useState<RemoteState<T>>(() =>
    cached !== undefined ? { status: 'success', data: cached } : { status: 'idle' },
  )
  const [isFetching, setIsFetching] = useState(false)
  const loadRef = useRef(load)
  const cacheKeyRef = useRef(cacheKey)
  const staleTimeRef = useRef(staleTime)
  const stateRef = useRef(state)

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

  // When the cache key changes, seed from cache if present.
  useEffect(() => {
    if (!cacheKey) return
    const hit = remoteCacheGet<T>(cacheKey)
    if (hit !== undefined) {
      setState({ status: 'success', data: hit })
    }
  }, [cacheKey])

  const refetch = useCallback(async (refetchOptions?: RefetchOptions) => {
    const fresh = refetchOptions?.fresh === true
    const hadData =
      !fresh && stateRef.current.status === 'success'
        ? (stateRef.current as RemoteSuccess<T>).data
        : undefined

    if (fresh || hadData === undefined) {
      setState({ status: 'loading' })
    }
    setIsFetching(true)
    try {
      const data = await loadRef.current()
      setState({ status: 'success', data })
      const key = cacheKeyRef.current
      if (key) remoteCacheSet(key, data, staleTimeRef.current)
    } catch (error) {
      if (hadData !== undefined) {
        setState({ status: 'success', data: hadData })
      } else {
        setState({ status: 'error', error })
      }
    } finally {
      setIsFetching(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    // Fresh cache hit: show it and skip the network until expiry / invalidate / refetch.
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
