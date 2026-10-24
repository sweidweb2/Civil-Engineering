import type { AppConfig } from '../../config/index.js'
import { loadConfig } from '../../config/index.js'
import { getStorageService, type StorageService } from '../../storage/index.js'
import { createListingsController } from './listings.controller.js'
import { createListingsRepository } from './listings.repository.js'
import { createListingsRoutes } from './listings.routes.js'
import { createListingsService, type ListingsService } from './listings.service.js'

export type ListingsModuleDeps = {
  config?: AppConfig
  storage?: StorageService
}

let listingsServiceSingleton: ListingsService | null = null

export function getListingsService(deps: ListingsModuleDeps = {}): ListingsService {
  if (!listingsServiceSingleton) {
    const config = deps.config ?? loadConfig()
    const storage =
      deps.storage ?? (config.storage ? getStorageService(config) : undefined)
    const repository = createListingsRepository()
    listingsServiceSingleton = createListingsService(repository, { config, storage })
  }
  return listingsServiceSingleton
}

export function createListingsModule(deps: ListingsModuleDeps = {}) {
  const service = getListingsService(deps)
  const controller = createListingsController(service)
  return createListingsRoutes(controller)
}

export {
  findListingNames,
  findListingSnapshot,
  listingExists,
  listListingChoices,
  searchListingIdsByName,
} from './listings.access.js'
export type { ListingSnapshot } from './listings.access.js'
export { listingsDomain } from './listings.domain.js'
export { createListingsService }
export type { ListingsService } from './listings.service.js'
