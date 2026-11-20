import { useState } from 'react'
import { act, create } from 'react-test-renderer'

import { useRemoteData } from '@/hooks/useRemoteData'
import { useSeedOnce } from '@/hooks/useSeedOnce'
import {
  remoteCacheInvalidate,
  remoteCacheRead,
  remoteCacheRevalidate,
  remoteCacheSet,
} from '@/lib/remoteCache'

jest.mock('@/stores/authStore', () => ({
  useAuthStore: { getState: () => ({ tokens: { accessToken: 't', refreshToken: 'r' } }) },
}))

type Hook = ReturnType<typeof useRemoteData<string>>

async function mount(load: () => Promise<string>, cacheKey: string) {
  const ref: { current: Hook | null } = { current: null }
  const seen: string[] = []
  function Probe() {
    ref.current = useRemoteData(load, { cacheKey })
    seen.push(ref.current.isLoading ? 'skeleton' : String(dataOf(ref.current)))
    return null
  }
  let root!: ReturnType<typeof create>
  await act(async () => {
    root = create(<Probe />)
  })
  return { ref: ref as { current: Hook }, seen, unmount: () => act(() => root.unmount()) }
}

const dataOf = (hook: Hook) => (hook.status === 'success' ? hook.data : undefined)
/** staleMs < 0 → entry is already stale but inside the keep window. */
const putStale = (key: string, data: string) => remoteCacheSet(key, data, -1)

describe('useRemoteData (phase 2)', () => {
  beforeEach(() => remoteCacheInvalidate())

  it('shows stale data instantly and revalidates in the background (no skeleton)', async () => {
    putStale('dashboard:pm', 'yesterday')
    const load = jest.fn().mockResolvedValue('today')
    const { ref, seen, unmount } = await mount(load, 'dashboard:pm')

    expect(load).toHaveBeenCalledTimes(1)
    expect(dataOf(ref.current)).toBe('today')
    expect(seen).not.toContain('skeleton')
    expect(seen[0]).toBe('yesterday')
    expect(remoteCacheRead('dashboard:pm')).toEqual({ data: 'today', fresh: true })
    await unmount()
  })

  it('does not refetch fresh data', async () => {
    remoteCacheSet('dashboard:pm', 'now')
    const load = jest.fn().mockResolvedValue('x')
    const { unmount } = await mount(load, 'dashboard:pm')
    expect(load).not.toHaveBeenCalled()
    await unmount()
  })

  it('foreground revalidate refetches only stale keys', async () => {
    const loadA = jest.fn().mockResolvedValue('a')
    const a = await mount(loadA, 'projects:list:1')
    expect(loadA).toHaveBeenCalledTimes(1)

    // Still fresh: coming back to the app costs nothing.
    await act(async () => remoteCacheRevalidate())
    expect(loadA).toHaveBeenCalledTimes(1)

    // Make it stale, then come back again → one background refetch.
    putStale('projects:list:1', 'a')
    await act(async () => remoteCacheRevalidate())
    expect(loadA).toHaveBeenCalledTimes(2)
    await a.unmount()
  })

  it('refetch resolves false when a refresh fails but old data stays on screen', async () => {
    const load = jest.fn().mockResolvedValueOnce('kept').mockRejectedValueOnce(new Error('offline'))
    const { ref, unmount } = await mount(load, 'providers:me')
    let ok: boolean | undefined
    await act(async () => {
      ok = await ref.current.refetch()
    })
    expect(ok).toBe(false)
    expect(dataOf(ref.current)).toBe('kept')
    await unmount()
  })
})

describe('useSeedOnce', () => {
  it('seeds a form once, then ignores refetched data until the reset key changes', async () => {
    const forms: string[] = []
    let setSource!: (v: string) => void
    let setTab!: (v: string) => void
    function Probe() {
      const [source, _setSource] = useState<string | null>(null)
      const [tab, _setTab] = useState('a')
      setSource = _setSource
      setTab = _setTab
      useSeedOnce(source, (s) => forms.push(`${tab}:${s}`), tab)
      return null
    }
    let root!: ReturnType<typeof create>
    await act(async () => {
      root = create(<Probe />)
    })
    await act(async () => setSource('v1'))
    await act(async () => setSource('v2')) // background refetch while editing
    expect(forms).toEqual(['a:v1'])
    await act(async () => setTab('b')) // switch stage → seed that stage once
    expect(forms).toEqual(['a:v1', 'b:v2'])
    await act(async () => root.unmount())
  })
})
