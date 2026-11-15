import { remoteCacheInvalidate } from '@/lib/remoteCache'

/** Shared remote-cache key prefixes used across features. */
export const cacheKeys = {
  providersMe: 'providers:me',
  dashboardAdmin: 'dashboard:admin',
  dashboardPm: 'dashboard:pm',
  dashboardProvider: 'dashboard:provider',
  categoriesPicker: 'categories:picker',
  providersPicker: 'providers:picker',
  listingsMine: 'listings:mine',
  listingsAdmin: 'listings:admin',
  directory: 'directory:list',
  projects: 'projects:list',
  users: 'users:list',
  providers: 'providers:list',
  categories: 'categories:list',
  reviews: 'reviews:list',
  queue: 'queue:list',
} as const

/** After listing create/update/delete. */
export function invalidateListingCaches() {
  remoteCacheInvalidate(cacheKeys.dashboardProvider)
  remoteCacheInvalidate(cacheKeys.dashboardAdmin)
  remoteCacheInvalidate(cacheKeys.listingsMine)
  remoteCacheInvalidate(cacheKeys.listingsAdmin)
  remoteCacheInvalidate(cacheKeys.directory)
}

/** After project create/update/archive. */
export function invalidateProjectCaches() {
  remoteCacheInvalidate(cacheKeys.dashboardPm)
  remoteCacheInvalidate(cacheKeys.dashboardAdmin)
  remoteCacheInvalidate(cacheKeys.projects)
}

/** After user / approval / provider / review admin mutations. */
export function invalidateAdminCaches() {
  remoteCacheInvalidate(cacheKeys.dashboardAdmin)
  remoteCacheInvalidate(cacheKeys.users)
  remoteCacheInvalidate(cacheKeys.providers)
  remoteCacheInvalidate(cacheKeys.queue)
  remoteCacheInvalidate(cacheKeys.reviews)
  remoteCacheInvalidate(cacheKeys.categories)
  remoteCacheInvalidate(cacheKeys.categoriesPicker)
  remoteCacheInvalidate(cacheKeys.providersPicker)
}

/** After provider profile save. */
export function invalidateProviderProfileCaches() {
  remoteCacheInvalidate(cacheKeys.providersMe)
  remoteCacheInvalidate(cacheKeys.dashboardProvider)
}
