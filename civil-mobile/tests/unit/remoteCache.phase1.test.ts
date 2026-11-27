import { hasMorePages, MAX_PAGED_ROWS, mergePageRows } from '@/lib/pagedRows'
import {
  REMOTE_CACHE_MAX_ENTRIES,
  REMOTE_KEEP_MS,
  remoteCacheFetch,
  remoteCacheGeneration,
  remoteCacheGet,
  remoteCacheInvalidate,
  remoteCacheRead,
  remoteCacheRevalidate,
  remoteCacheSet,
  remoteCacheSubscribe,
} from '@/lib/remoteCache'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

describe('remoteCache: invalidation listeners', () => {
  beforeEach(() => remoteCacheInvalidate())

  it('notifies subscribers with the invalidated prefix', () => {
    const listener = jest.fn()
    const off = remoteCacheSubscribe(listener)
    remoteCacheInvalidate('listings:mine')
    expect(listener).toHaveBeenCalledWith({ type: 'invalidate', prefix: 'listings:mine' })
    off()
    remoteCacheInvalidate('listings:mine')
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('does not notify on a full wipe (session change) but bumps the generation', () => {
    const listener = jest.fn()
    const off = remoteCacheSubscribe(listener)
    const before = remoteCacheGeneration()
    remoteCacheInvalidate()
    expect(listener).not.toHaveBeenCalled()
    expect(remoteCacheGeneration()).toBe(before + 1)
    off()
  })
})

describe('remoteCache: foreground revalidate', () => {
  beforeEach(() => remoteCacheInvalidate())

  it('emits a revalidate event to subscribers', () => {
    const listener = jest.fn()
    const off = remoteCacheSubscribe(listener)
    remoteCacheRevalidate()
    expect(listener).toHaveBeenCalledWith({ type: 'revalidate' })
    off()
  })
})

describe('remoteCacheFetch', () => {
  beforeEach(() => remoteCacheInvalidate())

  it('shares one in-flight request per key and caches the result', async () => {
    const d = deferred<string>()
    const load = jest.fn(() => d.promise)
    const a = remoteCacheFetch('dashboard:admin', load)
    const b = remoteCacheFetch('dashboard:admin', load)
    expect(load).toHaveBeenCalledTimes(1)
    d.resolve('ok')
    await expect(Promise.all([a, b])).resolves.toEqual(['ok', 'ok'])
    expect(remoteCacheGet('dashboard:admin')).toBe('ok')
  })

  it('does not cache a response that started before a logout / login', async () => {
    const d = deferred<string>()
    const pending = remoteCacheFetch('providers:me', () => d.promise)
    remoteCacheInvalidate() // user A logs out, user B logs in
    d.resolve("user A's provider")
    await pending
    expect(remoteCacheGet('providers:me')).toBeUndefined()
  })

  it('does not cache a response for a key invalidated mid-flight, and starts a new request', async () => {
    const old = deferred<string>()
    const pending = remoteCacheFetch('listings:mine:1', () => old.promise)
    remoteCacheInvalidate('listings:mine')
    const fresh = jest.fn(async () => 'new')
    await expect(remoteCacheFetch('listings:mine:1', fresh)).resolves.toBe('new')
    expect(fresh).toHaveBeenCalledTimes(1)
    old.resolve('old')
    await pending
    expect(remoteCacheGet('listings:mine:1')).toBe('new')
  })

  it('respects shouldStore (no tokens → no cache write)', async () => {
    await remoteCacheFetch('x', async () => 1, { shouldStore: () => false })
    expect(remoteCacheGet('x')).toBeUndefined()
  })
})

describe('remoteCache: bounds', () => {
  beforeEach(() => remoteCacheInvalidate())

  it('evicts the least-recently-used entry past the cap', () => {
    for (let i = 0; i < REMOTE_CACHE_MAX_ENTRIES; i += 1) remoteCacheSet(`k${i}`, i)
    remoteCacheGet('k0') // touch: k0 becomes most recent, k1 is now oldest
    remoteCacheSet('extra', 'x')
    expect(remoteCacheGet('k0')).toBe(0)
    expect(remoteCacheGet('k1')).toBeUndefined()
    expect(remoteCacheGet('extra')).toBe('x')
  })

  it('keeps stale entries for the keep window, then sweeps them on write', () => {
    jest.useFakeTimers()
    try {
      remoteCacheSet('search:a', 1, 1_000)
      jest.advanceTimersByTime(1_001)
      // Stale: not returned as fresh, but still readable for stale-while-revalidate.
      expect(remoteCacheGet('search:a')).toBeUndefined()
      expect(remoteCacheRead('search:a')).toEqual({ data: 1, fresh: false })
      jest.advanceTimersByTime(REMOTE_KEEP_MS)
      remoteCacheSet('search:b', 2)
      expect(remoteCacheRead('search:a')).toBeUndefined()
      expect(remoteCacheGet('search:b')).toBe(2)
    } finally {
      jest.useRealTimers()
    }
  })
})

describe('mergePageRows', () => {
  it('replaces rows already shown and appends new ones in order', () => {
    const current = [
      { id: 'a', v: 1 },
      { id: 'b', v: 1 },
    ]
    const incoming = [
      { id: 'b', v: 2 },
      { id: 'c', v: 1 },
    ]
    expect(mergePageRows(current, incoming)).toEqual([
      { id: 'a', v: 1 },
      { id: 'b', v: 2 },
      { id: 'c', v: 1 },
    ])
  })

  it('caps accumulated rows at maxRows (keeps earliest pages)', () => {
    const current = Array.from({ length: 4 }, (_, i) => ({ id: String(i), v: 1 }))
    const incoming = [
      { id: '4', v: 1 },
      { id: '5', v: 1 },
    ]
    expect(mergePageRows(current, incoming, 5).map((r) => r.id)).toEqual(['0', '1', '2', '3', '4'])
  })
})

describe('hasMorePages', () => {
  it('stops when the in-memory cap is reached even if total is higher', () => {
    expect(hasMorePages(MAX_PAGED_ROWS, MAX_PAGED_ROWS + 50)).toBe(false)
    expect(hasMorePages(20, 100)).toBe(true)
  })
})
