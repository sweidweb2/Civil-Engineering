import {
  cacheKeys,
  invalidateGalleryCaches,
  invalidateListingCaches,
  invalidateProviderProfileCaches,
} from '@/lib/cacheKeys'
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

  it('invalidates exact key and every key with that prefix', () => {
    remoteCacheSet('listings:mine', [])
    remoteCacheSet('listings:mine:1::', [])
    remoteCacheSet('listings:admin:1::', [])
    remoteCacheSet('providers:me', { id: '1' })
    remoteCacheInvalidate('listings:mine')
    expect(remoteCacheGet('listings:mine')).toBeUndefined()
    expect(remoteCacheGet('listings:mine:1::')).toBeUndefined()
    expect(remoteCacheGet('listings:admin:1::')).toEqual([])
    expect(remoteCacheGet('providers:me')).toEqual({ id: '1' })
  })

  it('invalidateListingCaches clears paged list keys and dashboards', () => {
    remoteCacheSet(`${cacheKeys.listingsMine}:1::`, [])
    remoteCacheSet(cacheKeys.dashboardProvider, {})
    remoteCacheSet(cacheKeys.providersMe, { id: '1' })
    invalidateListingCaches()
    expect(remoteCacheGet(`${cacheKeys.listingsMine}:1::`)).toBeUndefined()
    expect(remoteCacheGet(cacheKeys.dashboardProvider)).toBeUndefined()
    expect(remoteCacheGet(cacheKeys.providersMe)).toEqual({ id: '1' })
  })

  it('invalidateProviderProfileCaches clears profile, provider list, and dashboards', () => {
    remoteCacheSet(cacheKeys.providersMe, { id: '1' })
    remoteCacheSet(cacheKeys.dashboardProvider, {})
    remoteCacheSet(`${cacheKeys.providers}:1::`, [])
    remoteCacheSet(cacheKeys.dashboardAdmin, {})
    invalidateProviderProfileCaches()
    expect(remoteCacheGet(cacheKeys.providersMe)).toBeUndefined()
    expect(remoteCacheGet(cacheKeys.dashboardProvider)).toBeUndefined()
    expect(remoteCacheGet(`${cacheKeys.providers}:1::`)).toBeUndefined()
    expect(remoteCacheGet(cacheKeys.dashboardAdmin)).toBeUndefined()
  })

  it('invalidateGalleryCaches routes by kind', () => {
    remoteCacheSet(`${cacheKeys.listingsMine}:1::`, [])
    remoteCacheSet(`${cacheKeys.projects}:1::`, [])
    invalidateGalleryCaches('listing')
    expect(remoteCacheGet(`${cacheKeys.listingsMine}:1::`)).toBeUndefined()
    expect(remoteCacheGet(`${cacheKeys.projects}:1::`)).toEqual([])
    remoteCacheSet(`${cacheKeys.projects}:1::`, [])
    invalidateGalleryCaches('project')
    expect(remoteCacheGet(`${cacheKeys.projects}:1::`)).toBeUndefined()
  })
})
