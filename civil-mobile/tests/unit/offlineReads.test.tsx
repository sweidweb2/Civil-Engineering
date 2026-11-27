import { act, create } from 'react-test-renderer'

import { SAVED_COPY_GRACE_MS, useRemoteData } from '@/hooks/useRemoteData'
import {
  offlineSnapshotPut,
  offlineSnapshotSettled,
  setOfflineSnapshotStorage,
} from '@/lib/offlineSnapshot'
import { remoteCacheInvalidate } from '@/lib/remoteCache'
import { ApiError } from '@/services/api'
import { setOffline } from '@/services/connectivity'

import { memoryOfflineStorage } from './memoryOfflineStorage'

jest.mock('@/stores/authStore', () => ({
  useAuthStore: {
    getState: () => ({ user: { id: 'u1' }, tokens: { accessToken: 't', refreshToken: 'r' } }),
  },
}))

type Hook = ReturnType<typeof useRemoteData<string>>

async function mount(load: () => Promise<string>, cacheKey: string, persist = true) {
  const ref: { current: Hook | null } = { current: null }
  const seen: unknown[] = []
  function Probe() {
    ref.current = useRemoteData(load, { cacheKey, persist })
    if (ref.current.status === 'success') seen.push(ref.current.data)
    return null
  }
  let root!: ReturnType<typeof create>
  await act(async () => {
    root = create(<Probe />)
  })
  return { ref: ref as { current: Hook }, seen, unmount: () => act(() => root.unmount()) }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const dataOf = (hook: Hook) => (hook.status === 'success' ? hook.data : undefined)
const networkDown = () => new TypeError('Network request failed')

describe('useRemoteData offline reads', () => {
  beforeEach(() => {
    setOfflineSnapshotStorage(memoryOfflineStorage().storage)
    remoteCacheInvalidate()
    setOffline(false)
  })
  afterEach(() => {
    jest.useRealTimers()
    setOffline(false)
  })
  afterAll(() => setOfflineSnapshotStorage(null))

  it('shows the last saved copy when the network is down and marks it as offline', async () => {
    await offlineSnapshotPut('u1', 'dashboard:pm', 'saved yesterday')
    const { ref, unmount } = await mount(jest.fn().mockRejectedValue(networkDown()), 'dashboard:pm')
    expect(dataOf(ref.current)).toBe('saved yesterday')
    expect(typeof ref.current.offlineSavedAt).toBe('number')
    await unmount()
  })

  it('saves live responses and clears the offline flag once live data loads', async () => {
    const live = await mount(jest.fn().mockResolvedValue('live'), 'dashboard:pm')
    expect(live.ref.current.offlineSavedAt).toBeNull()
    await live.unmount()
    await offlineSnapshotSettled()

    remoteCacheInvalidate()
    const offline = await mount(jest.fn().mockRejectedValue(networkDown()), 'dashboard:pm')
    expect(dataOf(offline.ref.current)).toBe('live')
    await offline.unmount()
  })

  it('does not save or read anything without persist', async () => {
    const live = await mount(jest.fn().mockResolvedValue('live'), 'users:list:wk:1::', false)
    await live.unmount()
    await offlineSnapshotSettled()

    remoteCacheInvalidate()
    const offline = await mount(
      jest.fn().mockRejectedValue(networkDown()),
      'users:list:wk:1::',
      false,
    )
    expect(offline.ref.current.status).toBe('error')
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
    const { ref, unmount } = await mount(
      jest.fn().mockRejectedValue(networkDown()),
      'dashboard:admin',
    )
    expect(ref.current.status).toBe('error')
    await unmount()
  })

  it('shows the saved copy while a slow request is pending, then swaps in live data', async () => {
    await offlineSnapshotPut('u1', 'dashboard:pm', 'saved')
    jest.useFakeTimers()
    const request = deferred<string>()
    const { ref, unmount } = await mount(() => request.promise, 'dashboard:pm')
    expect(ref.current.isLoading).toBe(true)

    await act(async () => {
      jest.advanceTimersByTime(SAVED_COPY_GRACE_MS)
    })
    expect(dataOf(ref.current)).toBe('saved')
    expect(ref.current.isFetching).toBe(true)
    expect(typeof ref.current.offlineSavedAt).toBe('number')

    await act(async () => request.resolve('live'))
    expect(dataOf(ref.current)).toBe('live')
    expect(ref.current.offlineSavedAt).toBeNull()
    await unmount()
  })

  it('never flashes the saved copy when the response is quick', async () => {
    await offlineSnapshotPut('u1', 'dashboard:pm', 'saved')
    jest.useFakeTimers()
    const request = deferred<string>()
    const { ref, seen, unmount } = await mount(() => request.promise, 'dashboard:pm')
    await act(async () => {
      jest.advanceTimersByTime(SAVED_COPY_GRACE_MS - 500)
    })
    await act(async () => request.resolve('live'))
    await act(async () => {
      jest.advanceTimersByTime(SAVED_COPY_GRACE_MS)
    })
    expect(dataOf(ref.current)).toBe('live')
    expect(seen).not.toContain('saved')
    await unmount()
  })

  it('shows the saved copy right away when the device is offline', async () => {
    await offlineSnapshotPut('u1', 'dashboard:pm', 'saved')
    setOffline(true)
    jest.useFakeTimers()
    const request = deferred<string>()
    const { ref, unmount } = await mount(() => request.promise, 'dashboard:pm')
    await act(async () => {
      jest.advanceTimersByTime(0)
    })
    expect(dataOf(ref.current)).toBe('saved')

    // The pending request then fails without a server response: keep the saved copy.
    await act(async () => request.reject(networkDown()))
    expect(dataOf(ref.current)).toBe('saved')
    await unmount()
  })

  it('replaces an early saved copy with a real server error', async () => {
    await offlineSnapshotPut('u1', 'dashboard:pm', 'saved')
    jest.useFakeTimers()
    const request = deferred<string>()
    const { ref, unmount } = await mount(() => request.promise, 'dashboard:pm')
    await act(async () => {
      jest.advanceTimersByTime(SAVED_COPY_GRACE_MS)
    })
    expect(dataOf(ref.current)).toBe('saved')

    await act(async () => request.reject(new ApiError(403, 'Forbidden')))
    expect(ref.current.status).toBe('error')
    expect(ref.current.offlineSavedAt).toBeNull()
    await unmount()
  })
})
