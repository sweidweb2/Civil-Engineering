import { useCallback, useEffect, useRef, useState } from 'react'

export type RemoteIdle = { status: 'idle' }
export type RemoteLoading = { status: 'loading' }
export type RemoteSuccess<T> = { status: 'success'; data: T }
export type RemoteError = { status: 'error'; error: unknown }

export type RemoteState<T> = RemoteIdle | RemoteLoading | RemoteSuccess<T> | RemoteError

type UseRemoteDataOptions = {
  /** When false, skip the initial fetch. Default true. */
  enabled?: boolean
}

type RefetchOptions = {
  /** Drop the current view and show the loading state. First load and query changes use this. */
  fresh?: boolean
}

/**
 * Lightweight server-data fetch for a screen/feature.
 * Keeps loading/error/data local — do not dump results into Zustand.
 * A later refetch keeps the current result on screen so the page does not
 * swap to a skeleton or jump scroll. A new query still shows the loading state.
 * A dedicated cache library (e.g. TanStack Query) stays TBD until needed.
 */
export function useRemoteData<T>(load: () => Promise<T>, options: UseRemoteDataOptions = {}) {
  const { enabled = true } = options
  const [state, setState] = useState<RemoteState<T>>({ status: 'idle' })
  const loadRef = useRef(load)
  const requestRef = useRef(0)

  useEffect(() => {
    loadRef.current = load
  }, [load])

  const refetch = useCallback(async (options?: RefetchOptions) => {
    const fresh = options?.fresh === true
    const requestId = ++requestRef.current

    setState((current) => {
      if (!fresh && current.status === 'success') return current
      return { status: 'loading' }
    })

    try {
      const data = await loadRef.current()
      if (requestId !== requestRef.current) return
      setState({ status: 'success', data })
    } catch (error) {
      if (requestId !== requestRef.current) return
      setState((current) => {
        if (!fresh && current.status === 'success') return current
        return { status: 'error', error }
      })
    }
  }, [])

  const mutate = useCallback((updater: (current: T) => T) => {
    setState((current) =>
      current.status === 'success' ? { status: 'success', data: updater(current.data) } : current,
    )
  }, [])

  useEffect(() => {
    if (!enabled) return
    void refetch({ fresh: true })
  }, [enabled, refetch, load])

  return {
    ...state,
    refetch,
    mutate,
    isLoading: state.status === 'loading' || state.status === 'idle',
    isError: state.status === 'error',
    isSuccess: state.status === 'success',
    error: state.status === 'error' ? state.error : undefined,
  }
}
