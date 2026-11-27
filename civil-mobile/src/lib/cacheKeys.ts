import { remoteCacheInvalidate } from '@/lib/remoteCache'

/** Shared remote-cache key prefixes used across features. */
export const cacheKeys = {
  providersMe: 'providers:me',
  workersMe: 'workers:me',
  /** `me:avatar:<userId>` — signed-in user's own avatar URL. */
  myAvatar: 'me:avatar',
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
  /**
   * `projects:detail-v2:<id>` — GET `/projects/:id/detail` payload
   * `{ data: { project, stages } }` shared by project + stages screens.
   * `-v2` avoids colliding with pre-bundle caches that stored a bare project.
   */
  projectDetail: 'projects:detail-v2',
  /**
   * Legacy prefix kept for invalidate-all on project mutations.
   * Stage-only entries are no longer written; detail embeds stages.
   */
  projectStages: 'projects:stages',
  /** `projects:productivity:<id>` — daily productivity hours series. */
  projectProductivity: 'projects:productivity',
  /** `listings:detail:<id>:view|edit` — one listing (detail screen / editor). */
  listingDetail: 'listings:detail',
  users: 'users:list',
  providers: 'providers:list',
  categories: 'categories:list',
  reviews: 'reviews:list',
  queue: 'queue:list',
  verifications: 'verifications:list',
  designRequests: 'design-requests:list',
  designOffers: 'design-offers:list',
} as const

/**
 * How long reference data stays fresh (`useRemoteData` `staleTime`). Lists, dashboards
 * and details keep the 30s default; admin edits invalidate these keys anyway.
 */
export const cacheTtl = {
  /** Category trees used by pickers: change rarely. */
  reference: 15 * 60_000,
  /** Admin provider picker: changes when providers are created / renamed. */
  picker: 5 * 60_000,
} as const

/** After listing create/update/delete or listing gallery changes. */
export function invalidateListingCaches() {
  remoteCacheInvalidate(cacheKeys.dashboardProvider)
  remoteCacheInvalidate(cacheKeys.dashboardAdmin)
  remoteCacheInvalidate(cacheKeys.listingsMine)
  remoteCacheInvalidate(cacheKeys.listingsAdmin)
  remoteCacheInvalidate(cacheKeys.directory)
  remoteCacheInvalidate(cacheKeys.listingDetail)
  // Category and provider lists show per-row listing counts.
  remoteCacheInvalidate(cacheKeys.categories)
  remoteCacheInvalidate(cacheKeys.providers)
}

/** After project create/update/archive or project gallery changes. */
export function invalidateProjectCaches() {
  remoteCacheInvalidate(cacheKeys.dashboardPm)
  remoteCacheInvalidate(cacheKeys.dashboardAdmin)
  remoteCacheInvalidate(cacheKeys.projects)
  remoteCacheInvalidate(cacheKeys.projectDetail)
  remoteCacheInvalidate(cacheKeys.projectStages)
  remoteCacheInvalidate(cacheKeys.projectProductivity)
}

/**
 * After gallery upload/delete/set-main. Narrower than full listing/project
 * invalidation — category/provider count lists and stage/productivity keys are
 * unchanged when only images move.
 */
export function invalidateGalleryCaches(kind: 'listing' | 'project') {
  if (kind === 'listing') {
    remoteCacheInvalidate(cacheKeys.listingDetail)
    remoteCacheInvalidate(cacheKeys.listingsMine)
    remoteCacheInvalidate(cacheKeys.listingsAdmin)
    remoteCacheInvalidate(cacheKeys.directory)
    remoteCacheInvalidate(cacheKeys.dashboardProvider)
    remoteCacheInvalidate(cacheKeys.dashboardAdmin)
    return
  }
  remoteCacheInvalidate(cacheKeys.projectDetail)
  remoteCacheInvalidate(cacheKeys.projects)
  remoteCacheInvalidate(cacheKeys.dashboardPm)
  remoteCacheInvalidate(cacheKeys.dashboardAdmin)
}

/** After user / approval / provider / review admin mutations. */
export function invalidateAdminCaches() {
  remoteCacheInvalidate(cacheKeys.dashboardAdmin)
  remoteCacheInvalidate(cacheKeys.users)
  remoteCacheInvalidate(cacheKeys.providers)
  remoteCacheInvalidate(cacheKeys.queue)
  remoteCacheInvalidate(cacheKeys.verifications)
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
  // Name / logo also appear in the admin provider picker and the directory.
  remoteCacheInvalidate(cacheKeys.providersPicker)
  remoteCacheInvalidate(cacheKeys.directory)
}

/** After worker CV create/update/delete. */
export function invalidateWorkerCaches() {
  remoteCacheInvalidate(cacheKeys.workersMe)
  remoteCacheInvalidate(cacheKeys.dashboardWorker)
  // CV fields and the public-visibility flag show in the worker directory.
  remoteCacheInvalidate(cacheKeys.directory)
}

/** After the signed-in user edits their own name / phone (shown in admin lists and directory). */
export function invalidateOwnAccountCaches() {
  remoteCacheInvalidate(cacheKeys.users)
  remoteCacheInvalidate(cacheKeys.directory)
}
