import { act, create } from 'react-test-renderer'

import { useRemoteData } from '@/hooks/useRemoteData'
import { remoteCacheGet, remoteCacheInvalidate } from '@/lib/remoteCache'

// The real store pulls in expo-router; the hook only reads `tokens`.
jest.mock('@/stores/authStore', () => ({
  useAuthStore: { getState: () => ({ tokens: { accessToken: 't', refreshToken: 'r' } }) },
}))

type Hook = ReturnType<typeof useRemoteData<string>>

async function mount(load: () => Promise<string>, cacheKey: string) {
  const ref: { current: Hook | null } = { current: null }
  function Probe() {
    ref.current = useRemoteData(load, { cacheKey })
    return null
  }
  let root!: ReturnType<typeof create>
  await act(async () => {
    root = create(<Probe />)
  })
  return { ref: ref as { current: Hook }, unmount: () => act(() => root.unmount()) }
}

const dataOf = (hook: Hook) => (hook.status === 'success' ? hook.data : undefined)

describe('useRemoteData (phase 1)', () => {
  beforeEach(() => remoteCacheInvalidate())

  it('an open screen refetches in the background when its key is invalidated', async () => {
    const load = jest.fn().mockResolvedValueOnce('old price').mockResolvedValueOnce('new price')
    const { ref, unmount } = await mount(load, 'listings:mine:grid:1::')
    expect(dataOf(ref.current)).toBe('old price')

    // Edit screen saves, then invalidates the listings prefix.
    await act(async () => {
      remoteCacheInvalidate('listings:mine')
    })

    expect(load).toHaveBeenCalledTimes(2)
    expect(dataOf(ref.current)).toBe('new price')
    await unmount()
  })

  it('ignores invalidation of unrelated prefixes', async () => {
    const load = jest.fn().mockResolvedValue('x')
    const { unmount } = await mount(load, 'projects:list:1')
    await act(async () => {
      remoteCacheInvalidate('listings:mine')
    })
    expect(load).toHaveBeenCalledTimes(1)
    await unmount()
  })

  it('drops a response that resolves after a session change', async () => {
    let resolve!: (v: string) => void
    const load = jest.fn(
      () =>
        new Promise<string>((r) => {
          resolve = r
        }),
    )
    const { ref, unmount } = await mount(load, 'providers:me')
    await act(async () => {
      remoteCacheInvalidate() // logout → next user logs in
      resolve("previous user's data")
    })
    expect(dataOf(ref.current)).toBeUndefined()
    expect(remoteCacheGet('providers:me')).toBeUndefined()
    await unmount()
  })
})
