import { act, create } from 'react-test-renderer'

import { useRemoteData } from '@/hooks/useRemoteData'
import {
  offlineSnapshotPut,
  type OfflineSnapshotStorage,
  setOfflineSnapshotStorage,
} from '@/lib/offlineSnapshot'
import { remoteCacheInvalidate } from '@/lib/remoteCache'
import { ApiError } from '@/services/api'

jest.mock('@/stores/authStore', () => ({
  useAuthStore: {
    getState: () => ({ user: { id: 'u1' }, tokens: { accessToken: 't', refreshToken: 'r' } }),
  },
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

describe('useRemoteData offline reads', () => {
  beforeEach(() => {
    const files = new Map<string, string>()
    const storage: OfflineSnapshotStorage = {
      read: async (u) => files.get(u) ?? null,
      write: (u, t) => void files.set(u, t),
      clearAll: () => files.clear(),
    }
    setOfflineSnapshotStorage(storage)
    remoteCacheInvalidate()
  })
  afterAll(() => setOfflineSnapshotStorage(null))

  it('shows the last saved copy when the network is down and marks it as offline', async () => {
    await offlineSnapshotPut('u1', 'dashboard:pm', 'saved yesterday')
    const load = jest.fn().mockRejectedValue(new TypeError('Network request failed'))
    const { ref, unmount } = await mount(load, 'dashboard:pm')
    expect(dataOf(ref.current)).toBe('saved yesterday')
    expect(typeof ref.current.offlineSavedAt).toBe('number')
    await unmount()
  })

  it('saves live responses and clears the offline flag once live data loads', async () => {
    const live = await mount(jest.fn().mockResolvedValue('live'), 'dashboard:pm')
    expect(live.ref.current.offlineSavedAt).toBeNull()
    await live.unmount()

    remoteCacheInvalidate()
    const offline = await mount(
      jest.fn().mockRejectedValue(new TypeError('Network request failed')),
      'dashboard:pm',
    )
    expect(dataOf(offline.ref.current)).toBe('live')
    await offline.unmount()
  })

  it('does not hide real server errors behind saved data', async () => {
    await offlineSnapshotPut('u1', 'dashboard:pm', 'saved')
    const load = jest.fn().mockRejectedValue(new ApiError(403, 'Forbidden'))
    const { ref, unmount } = await mount(load, 'dashboard:pm')
    expect(ref.current.status).toBe('error')
    await unmount()
  })

  it('shows the error when nothing was saved for that key', async () => {
    const load = jest.fn().mockRejectedValue(new TypeError('Network request failed'))
    const { ref, unmount } = await mount(load, 'dashboard:admin')
    expect(ref.current.status).toBe('error')
    await unmount()
  })
})
