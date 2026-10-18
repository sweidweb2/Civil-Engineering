import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type QueryKey, useQuery, useQueryClient } from '@tanstack/react-query'

export type RemoteIdle = { status: 'idle' }
export type RemoteLoading = { status: 'loading' }
export type RemoteSuccess<T> = { status: 'success'; data: T }
export type RemoteError = { status: 'error'; error: unknown }

export type RemoteState<T> = RemoteIdle | RemoteLoading | RemoteSuccess<T> | RemoteError

type UseRemoteDataOptions = {
  /** When false, skip the fetch. Default true. */
  enabled?: boolean
  /**
   * Stable cache key. Screens that pass the same key share one result.
   * A refetch reloads this query key only.
   */
  queryKey?: QueryKey
}

type RefetchOptions = {
  /** Drop the current view and show the loading state. */
  fresh?: boolean
}

let nextInstanceId = 1

/**
 * Server-data fetch for a screen/feature.
 * Keeps loading/error/data on the query key — do not dump results into Zustand.
 * A later refetch keeps the current result on screen. A new query with no cache
 * shows the loading state. Matching keys reuse the shared cache for 30 seconds
 * unless a refetch invalidates them.
 */
export function useRemoteData<T>(load: () => Promise<T>, options: UseRemoteDataOptions = {}) {
  const { enabled = true, queryKey } = options
  const [instanceId] = useState(() => nextInstanceId++)
  const [trackedLoad, setTrackedLoad] = useState(() => load)
  const [loadVersion, setLoadVersion] = useState(0)
  if (queryKey === undefined && load !== trackedLoad) {
    setTrackedLoad(() => load)
    setLoadVersion((current) => current + 1)
  }

  const key = useMemo<QueryKey>(
    () => (queryKey === undefined ? [instanceId, loadVersion] : queryKey),
    [instanceId, loadVersion, queryKey],
  )
  const keyRef = useRef(key)
  const client = useQueryClient()
  const [fresh, setFresh] = useState(false)

  useEffect(() => {
    keyRef.current = key
  }, [key])

  const query = useQuery({
    queryKey: key,
    enabled,
    retry: false,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    queryFn: () => load(),
  })

  const refetch = useCallback(async (refetchOptions?: RefetchOptions) => {
    const isFresh = refetchOptions?.fresh === true
    const currentKey = keyRef.current
    if (isFresh) setFresh(true)
    try {
      if (isFresh) client.removeQueries({ queryKey: currentKey, exact: true })
      await client.invalidateQueries({ queryKey: currentKey, exact: true })
    } finally {
      if (isFresh) setFresh(false)
    }
  }, [client])

  const mutate = useCallback(
    (updater: (current: T) => T) => {
      client.setQueryData<T>(keyRef.current, (current) =>
        current === undefined ? current : updater(current),
      )
    },
    [client],
  )

  const hasData = query.data !== undefined
  const showError = query.isError && (fresh || !hasData)
  const isLoading = fresh || (!enabled && !hasData) || (enabled && !hasData && !showError)
  const isError = showError
  const isSuccess = hasData && !showError

  const shared = {
    refetch,
    mutate,
    isLoading,
    isError,
    isSuccess,
    error: isError ? query.error : undefined,
  }

  if (isError) {
    return { status: 'error' as const, ...shared, error: query.error }
  }
  if (isSuccess) {
    return { status: 'success' as const, data: query.data as T, ...shared }
  }
  if (!enabled && !hasData) {
    return { status: 'idle' as const, ...shared }
  }
  return { status: 'loading' as const, ...shared }
}
