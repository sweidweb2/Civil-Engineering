import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'

import { useRemoteData } from '@/hooks/useRemoteData'

function wrapperFor(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

function client() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
}

describe('useRemoteData', () => {
  it('keeps the current result on screen while a later refetch runs', async () => {
    let release: (value: string) => void = () => {}
    let calls = 0
    const load = () => {
      calls += 1
      if (calls === 1) return Promise.resolve('kept')
      return new Promise<string>((resolve) => {
        release = resolve
      })
    }

    const { result } = renderHook(() => useRemoteData(load), { wrapper: wrapperFor(client()) })

    await waitFor(() => expect(result.current.status).toBe('success'))
    if (result.current.status !== 'success') return
    expect(result.current.data).toBe('kept')

    await act(async () => {
      void result.current.refetch()
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.status).toBe('success')
    if (result.current.status === 'success') expect(result.current.data).toBe('kept')

    await act(async () => {
      release('updated')
    })

    await waitFor(() => {
      expect(result.current.status).toBe('success')
      if (result.current.status === 'success') expect(result.current.data).toBe('updated')
    })
  })

  it('shows the loading state when the query itself changes', async () => {
    const loadReady = () => Promise.resolve('ready')
    const loadNext = () => new Promise<string>(() => {})
    const { result, rerender } = renderHook(
      ({ load }: { load: () => Promise<string> }) => useRemoteData(load),
      { initialProps: { load: loadReady }, wrapper: wrapperFor(client()) },
    )

    await waitFor(() => expect(result.current.status).toBe('success'))

    rerender({ load: loadNext })

    await waitFor(() => expect(result.current.isLoading).toBe(true))
  })

  it('reuses a cached result when two screens share a query key', async () => {
    let calls = 0
    const load = () => {
      calls += 1
      return Promise.resolve('shared')
    }
    const queryClient = client()
    const wrapper = wrapperFor(queryClient)
    const first = renderHook(() => useRemoteData(load, { queryKey: ['shared', 'item'] }), { wrapper })

    await waitFor(() => expect(first.result.current.status).toBe('success'))

    const second = renderHook(() => useRemoteData(() => Promise.resolve('other'), { queryKey: ['shared', 'item'] }), {
      wrapper,
    })

    await waitFor(() => expect(second.result.current.status).toBe('success'))
    if (second.result.current.status === 'success') expect(second.result.current.data).toBe('shared')
    expect(calls).toBe(1)
  })

  it('refetches only the query that asked', async () => {
    let listings = 0
    let details = 0
    const queryClient = client()
    const wrapper = wrapperFor(queryClient)
    const listingsHook = renderHook(
      () =>
        useRemoteData(
          () => {
            listings += 1
            return Promise.resolve('listings')
          },
          { queryKey: ['listings', 'page', 1] },
        ),
      { wrapper },
    )
    const detailsHook = renderHook(
      () =>
        useRemoteData(
          () => {
            details += 1
            return Promise.resolve('detail')
          },
          { queryKey: ['listings', 'detail'] },
        ),
      { wrapper },
    )

    await waitFor(() => expect(listingsHook.result.current.status).toBe('success'))
    await waitFor(() => expect(detailsHook.result.current.status).toBe('success'))

    await act(async () => {
      await listingsHook.result.current.refetch()
    })

    await waitFor(() => expect(listings).toBe(2))
    expect(details).toBe(1)
  })
})
