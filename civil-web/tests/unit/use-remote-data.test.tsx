import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useRemoteData } from '@/hooks/useRemoteData'

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

    const { result } = renderHook(() => useRemoteData(load))

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
      { initialProps: { load: loadReady } },
    )

    await waitFor(() => expect(result.current.status).toBe('success'))

    rerender({ load: loadNext })

    await waitFor(() => expect(result.current.isLoading).toBe(true))
  })
})
