import { remoteCacheInvalidate } from '@/lib/remoteCache'

/** Shared remote-cache key prefixes used across features. */
export const cacheKeys = {
  providersMe: 'providers:me',
  workersMe: 'workers:me',
  dashboardAdmin: 'dashboard:admin',
  dashboardPm: 'dashboard:pm',
  dashboardProvider: 'dashboard:provider',
  dashboardWorker: 'dashboard:worker',
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

/** After listing create/update/delete or listing gallery changes. */
export function invalidateListingCaches() {
  remoteCacheInvalidate(cacheKeys.dashboardProvider)
  remoteCacheInvalidate(cacheKeys.dashboardAdmin)
  remoteCacheInvalidate(cacheKeys.listingsMine)
  remoteCacheInvalidate(cacheKeys.listingsAdmin)
  remoteCacheInvalidate(cacheKeys.directory)
}

/** After project create/update/archive or project gallery changes. */
export function invalidateProjectCaches() {
  remoteCacheInvalidate(cacheKeys.dashboardPm)
  remoteCacheInvalidate(cacheKeys.dashboardAdmin)
  remoteCacheInvalidate(cacheKeys.projects)
}

/** After gallery upload/delete/set-main for a listing or project owner. */
export function invalidateGalleryCaches(kind: 'listing' | 'project') {
  if (kind === 'listing') invalidateListingCaches()
  else invalidateProjectCaches()
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
  remoteCacheInvalidate(cacheKeys.directory)
  remoteCacheInvalidate(cacheKeys.listingsAdmin)
}

/** After provider profile save or logo change. */
export function invalidateProviderProfileCaches() {
  remoteCacheInvalidate(cacheKeys.providersMe)
  remoteCacheInvalidate(cacheKeys.dashboardProvider)
  remoteCacheInvalidate(cacheKeys.providers)
  remoteCacheInvalidate(cacheKeys.dashboardAdmin)
}

/** After worker CV create/update/delete. */
export function invalidateWorkerCaches() {
  remoteCacheInvalidate(cacheKeys.workersMe)
  remoteCacheInvalidate(cacheKeys.dashboardWorker)
}
