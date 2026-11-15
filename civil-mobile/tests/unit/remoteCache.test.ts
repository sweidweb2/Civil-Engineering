import { remoteCacheGet, remoteCacheInvalidate, remoteCacheSet } from '@/lib/remoteCache'

describe('remoteCache', () => {
  beforeEach(() => {
    remoteCacheInvalidate()
  })

  it('stores and returns a fresh value', () => {
    remoteCacheSet('providers:me', { id: '1' })
    expect(remoteCacheGet<{ id: string }>('providers:me')).toEqual({ id: '1' })
  })

  it('expires after the stale window', () => {
    jest.useFakeTimers()
    remoteCacheSet('x', 42, 1_000)
    expect(remoteCacheGet<number>('x')).toBe(42)
    jest.advanceTimersByTime(1_001)
    expect(remoteCacheGet<number>('x')).toBeUndefined()
    jest.useRealTimers()
  })

  it('invalidates by exact key or prefix', () => {
    remoteCacheSet('listings:mine:1::', [])
    remoteCacheSet('listings:admin:1::', [])
    remoteCacheSet('providers:me', { id: '1' })
    remoteCacheInvalidate('listings:')
    expect(remoteCacheGet('listings:mine:1::')).toBeUndefined()
    expect(remoteCacheGet('listings:admin:1::')).toBeUndefined()
    expect(remoteCacheGet('providers:me')).toEqual({ id: '1' })
  })
})
