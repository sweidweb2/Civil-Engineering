import {
  cacheKeys,
  invalidateGalleryCaches,
  invalidateListingCaches,
  invalidateOwnAccountCaches,
  invalidateProviderProfileCaches,
  invalidateWorkerCaches,
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

  it('invalidateListingCaches also clears category and provider lists (listing counts)', () => {
    remoteCacheSet(`${cacheKeys.categories}:wk:1::`, [])
    remoteCacheSet(`${cacheKeys.providers}:wk:1::`, [])
    invalidateListingCaches()
    expect(remoteCacheGet(`${cacheKeys.categories}:wk:1::`)).toBeUndefined()
    expect(remoteCacheGet(`${cacheKeys.providers}:wk:1::`)).toBeUndefined()
  })

  it('invalidateProviderProfileCaches also clears the provider picker and directory', () => {
    remoteCacheSet(cacheKeys.providersPicker, [])
    remoteCacheSet(`${cacheKeys.directory}:pm:providers:1:`, {})
    invalidateProviderProfileCaches()
    expect(remoteCacheGet(cacheKeys.providersPicker)).toBeUndefined()
    expect(remoteCacheGet(`${cacheKeys.directory}:pm:providers:1:`)).toBeUndefined()
  })

  it('invalidateWorkerCaches also clears the directory (CV + visibility)', () => {
    remoteCacheSet(cacheKeys.workersMe, {})
    remoteCacheSet(`${cacheKeys.directory}:pm:workers:1:`, {})
    invalidateWorkerCaches()
    expect(remoteCacheGet(cacheKeys.workersMe)).toBeUndefined()
    expect(remoteCacheGet(`${cacheKeys.directory}:pm:workers:1:`)).toBeUndefined()
  })

  it('invalidateOwnAccountCaches clears user lists and directory only', () => {
    remoteCacheSet(`${cacheKeys.users}:wk:1::`, [])
    remoteCacheSet(`${cacheKeys.directory}:pm:workers:1:`, {})
    remoteCacheSet(cacheKeys.workersMe, {})
    invalidateOwnAccountCaches()
    expect(remoteCacheGet(`${cacheKeys.users}:wk:1::`)).toBeUndefined()
    expect(remoteCacheGet(`${cacheKeys.directory}:pm:workers:1:`)).toBeUndefined()
    expect(remoteCacheGet(cacheKeys.workersMe)).toEqual({})
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
