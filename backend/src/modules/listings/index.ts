import type { AppConfig } from '../../config/index.js'
import { loadConfig } from '../../config/index.js'
import { getStorageService, type StorageService } from '../../storage/index.js'
import { getProvidersService, type ProvidersService } from '../providers/index.js'
import { createListingsController } from './listings.controller.js'
import { createListingsRepository } from './listings.repository.js'
import { createListingsRoutes } from './listings.routes.js'
import { createListingsService, type ListingsService } from './listings.service.js'

export type ListingsModuleDeps = {
  config?: AppConfig
  storage?: StorageService
  /** Injected by the composition root; falls back to the providers singleton. */
  providers?: ProvidersService
}

let listingsServiceSingleton: ListingsService | null = null

/** Builds a fresh service. The composition root calls this once per app. */
export function buildListingsService(deps: ListingsModuleDeps = {}): ListingsService {
  const config = deps.config ?? loadConfig()
  const storage = deps.storage ?? (config.storage ? getStorageService(config) : undefined)
  const providers = deps.providers ?? getProvidersService({ config, storage })
  return createListingsService(createListingsRepository(), { config, storage, providers })
}

/** Standalone/test singleton (first caller's deps win). The app uses `composition-root.ts`. */
export function getListingsService(deps: ListingsModuleDeps = {}): ListingsService {
  listingsServiceSingleton ??= buildListingsService(deps)
  return listingsServiceSingleton
}

export function createListingsModule(
  deps: ListingsModuleDeps & { service?: ListingsService } = {},
) {
  const service = deps.service ?? getListingsService(deps)
  const controller = createListingsController(service)
  return createListingsRoutes(controller)
}

export type { ListingSnapshot } from './listings.types.js'
export { createListingsService }
export type { ListingsService } from './listings.service.js'
