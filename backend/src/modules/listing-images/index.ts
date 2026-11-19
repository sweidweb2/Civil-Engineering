import type { AppConfig } from '../../config/index.js'
import { loadConfig } from '../../config/index.js'
import { getStorageOrUnavailable, type StorageService } from '../../storage/index.js'
import type { ListingsService } from '../listings/index.js'
import { createListingImagesController } from './listing-images.controller.js'
import { createListingImagesRepository } from './listing-images.repository.js'
import { createListingImagesRouter } from './listing-images.routes.js'
import { createListingImagesService } from './listing-images.service.js'

export type ListingImagesModuleDeps = {
  listingsService: ListingsService
  config?: AppConfig
  storage?: StorageService
}

export function createListingImagesModule(deps: ListingImagesModuleDeps) {
  const config = deps.config ?? loadConfig()
  const storage = getStorageOrUnavailable(config, deps.storage)
  const service = createListingImagesService({
    repository: createListingImagesRepository(),
    listingsService: deps.listingsService,
    storage,
    config,
  })
  return createListingImagesRouter({
    controller: createListingImagesController({ service }),
  })
}

export * from './listing-images.controller.js'
export * from './listing-images.repository.js'
export * from './listing-images.routes.js'
export * from './listing-images.schema.js'
export * from './listing-images.service.js'
export * from './listing-images.types.js'
