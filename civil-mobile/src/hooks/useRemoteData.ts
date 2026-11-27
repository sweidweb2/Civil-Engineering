import { useCallback, useEffect, useRef, useState } from 'react'
import { useFocusEffect } from 'expo-router'

import { offlineSnapshotGet, offlineSnapshotPut } from '@/lib/offlineSnapshot'
import {
  REMOTE_STALE_MS,
  remoteCacheFetch,
  remoteCacheGeneration,
  remoteCacheGet,
  remoteCacheKeyMatches,
  remoteCacheRead,
  remoteCacheSubscribe,
} from '@/lib/remoteCache'
import { isServerUnreachable } from '@/lib/serverReachability'
import { isOffline } from '@/services/connectivity'
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
  /**
   * Save successful responses to disk for offline reading (`offlineSnapshot`). Only for
   * the signed-in user's own working data (dashboards, own profile, page 1 of own lists
   * without a search…), never admin lists of other people. Needs `cacheKey`.
   */
  persist?: boolean
}

/**
 * While a first load is pending, show the saved offline copy after this long (right
 * away when the device is known to be offline) instead of waiting for the request
 * timeout. A quick response replaces nothing, so good networks never see old data.
 */
export const SAVED_COPY_GRACE_MS = 2_000

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
 * or when the app returns to the foreground with stale data — but only while the
 * host screen is focused. Unfocused stack screens mark themselves dirty and
 * refresh on the next focus, so one mutation does not fan out across the stack.
 *
 * `refetch()` resolves `false` only when the request failed while previous data was
 * kept on screen (a silent refresh failure the caller may want to report — see
 * `usePullToRefresh`); otherwise `true`.
 *
 * Offline (`persist: true`): successful responses are saved to disk (`offlineSnapshot`).
 * When nothing is on screen yet, the last saved copy is shown if the request is still
 * pending after `SAVED_COPY_GRACE_MS` (immediately when offline), or if it fails
 * without a server response. `offlineSavedAt` is then set to when the copy was saved;
 * it returns to `null` once live data loads. A real server answer (`ApiError` other than
 * 502 / 503 / 504, see `isServerUnreachable`) still replaces the saved copy with the error.
 */
export function useRemoteData<T>(load: () => Promise<T>, options: UseRemoteDataOptions = {}) {
  const { enabled = true, cacheKey, staleTime = REMOTE_STALE_MS, persist = false } = options
  const cached = cacheKey ? remoteCacheRead<T>(cacheKey) : undefined
  const [state, setState] = useState<RemoteState<T>>(() =>
    cached !== undefined ? { status: 'success', data: cached.data } : { status: 'idle' },
  )
  const [isFetching, setIsFetching] = useState(false)
  /** Epoch ms of the saved copy on screen while offline; null when the data is live. */
  const [offlineSavedAt, setOfflineSavedAt] = useState<number | null>(null)
  const loadRef = useRef(load)
  const cacheKeyRef = useRef(cacheKey)
  const staleTimeRef = useRef(staleTime)
  const persistRef = useRef(persist)
  const stateRef = useRef(state)
  /** Cache key that `state` currently belongs to (prevents cross-page hadData). */
  const dataKeyRef = useRef<string | undefined>(cached !== undefined ? cacheKey : undefined)
  const requestIdRef = useRef(0)
  /** Saved-copy timer of the request in flight; cleared on unmount. */
  const graceTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const mountedRef = useRef(true)
  /**
   * Start unfocused; `useFocusEffect` sets true when the host screen is active.
   * Avoids a same-tick invalidate refetch before focus is known.
   * Unit tests' `useFocusEffect` stub focuses on mount so invalidate tests still pass.
   */
  const isFocusedRef = useRef(false)
  /** Invalidate/revalidate arrived while blurred — refetch on next focus. */
  const pendingRefreshRef = useRef(false)
  const refetchRef = useRef<(opts?: RefetchOptions) => Promise<boolean>>(async () => true)

  useEffect(() => {
    loadRef.current = load
  }, [load])

  useEffect(() => {
    cacheKeyRef.current = cacheKey
    staleTimeRef.current = staleTime
    persistRef.current = persist
  }, [cacheKey, staleTime, persist])

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      clearTimeout(graceTimerRef.current)
    }
  }, [])

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

  useEffect(() => {
    setOfflineSavedAt(null)
  }, [cacheKey])

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
      const isCurrent = () =>
        requestId === requestIdRef.current && generation === remoteCacheGeneration()

      // Saved offline copy for this key (read lazily, at most once per request).
      const userId = useAuthStore.getState().user?.id
      const persistKey = persistRef.current && requestKey && userId ? requestKey : undefined
      let saved: ReturnType<typeof offlineSnapshotGet> | undefined
      const readSaved = () => {
        if (!persistKey || !userId) return Promise.resolve(undefined)
        saved ??= offlineSnapshotGet(userId, persistKey)
        return saved
      }
      let showingSaved = false
      const showSaved = (entry: { data: unknown; savedAt: number }) => {
        dataKeyRef.current = requestKey
        show({ status: 'success', data: entry.data as T })
        setOfflineSavedAt(entry.savedAt)
        showingSaved = true
      }
      // Nothing on screen: show the saved copy if the request is slow (or we are offline).
      clearTimeout(graceTimerRef.current)
      const graceTimer =
        persistKey && hadData === undefined
          ? setTimeout(
              () => {
                if (!mountedRef.current) return
                void readSaved().then((entry) => {
                  if (
                    entry &&
                    mountedRef.current &&
                    isCurrent() &&
                    stateRef.current.status === 'loading'
                  ) {
                    showSaved(entry)
                  }
                })
              },
              isOffline() ? 0 : SAVED_COPY_GRACE_MS,
            )
          : undefined
      graceTimerRef.current = graceTimer

      try {
        const data = requestKey
          ? await remoteCacheFetch(requestKey, () => loadRef.current(), {
              staleMs: staleTimeRef.current,
              shouldStore: () => Boolean(useAuthStore.getState().tokens),
            })
          : await loadRef.current()
        if (!isCurrent()) return true
        dataKeyRef.current = requestKey
        show({ status: 'success', data })
        setOfflineSavedAt(null)
        if (persistKey && userId) void offlineSnapshotPut(userId, persistKey, data)
        return true
      } catch (error) {
        if (!isCurrent()) return true
        if (hadData !== undefined) {
          show({ status: 'success', data: hadData })
          return false
        }
        // A real server answer is shown even over a saved copy; with no answer from the
        // API (offline / timeout / gateway down), show the last saved copy if there is one.
        if (isServerUnreachable(error)) {
          if (showingSaved) return true
          if (!mountedRef.current) return true
          const entry = await readSaved()
          if (!isCurrent()) return true
          if (entry) {
            showSaved(entry)
            return true
          }
        }
        dataKeyRef.current = undefined
        setOfflineSavedAt(null)
        show({ status: 'error', error })
        return true
      } finally {
        if (graceTimer) clearTimeout(graceTimer)
        if (graceTimerRef.current === graceTimer) graceTimerRef.current = undefined
        if (requestId === requestIdRef.current) setIsFetching(false)
      }
    },
    [show],
  )

  useEffect(() => {
    refetchRef.current = refetch
  }, [refetch])

  // Track focus via Expo Router: unfocused stack screens defer invalidate/revalidate.
  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true
      if (enabled && pendingRefreshRef.current) {
        pendingRefreshRef.current = false
        void refetchRef.current()
      }
      return () => {
        isFocusedRef.current = false
      }
    }, [enabled]),
  )

  // Invalidation of this key (or a prefix of it) elsewhere → background refetch
  // while focused; otherwise wait until the screen is focused again.
  // App back in foreground → refetch only if this key is no longer fresh.
  // refetch() keeps the current data on screen, so there is no skeleton flash.
  useEffect(() => {
    if (!enabled || !cacheKey) return
    return remoteCacheSubscribe((event) => {
      const needsRefresh =
        event.type === 'invalidate'
          ? remoteCacheKeyMatches(cacheKey, event.prefix)
          : remoteCacheGet<T>(cacheKey) === undefined
      if (!needsRefresh) return
      if (isFocusedRef.current) void refetch()
      else pendingRefreshRef.current = true
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
    /** Set while a saved offline copy is shown (epoch ms it was saved), else null. */
    offlineSavedAt,
    /** True only when there is nothing to show yet. */
    isLoading:
      (!hasData && !isError && (state.status === 'loading' || state.status === 'idle')) ||
      (isFetching && !hasData && !isError),
    isError,
    isSuccess: hasData,
  }
}
