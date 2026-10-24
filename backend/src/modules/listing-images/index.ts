import type { AppConfig } from '../../config/index.js'
import { loadConfig } from '../../config/index.js'
import { getStorageService, type StorageService } from '../../storage/index.js'
import { getListingsService, type ListingsService } from '../listings/index.js'
import { createListingImagesController } from './listing-images.controller.js'
import { createListingImagesRepository } from './listing-images.repository.js'
import { createListingImagesRouter } from './listing-images.routes.js'
import { createListingImagesService } from './listing-images.service.js'

export type ListingImagesModuleDeps = {
  config?: AppConfig
  storage?: StorageService
  listingsService?: ListingsService
}

function unavailableStorage(): StorageService {
  const fail = async () => {
    throw new Error('Storage is not configured (STORAGE_* env vars required)')
  }
  return {
    bucket: 'unconfigured',
    presignPut: fail,
    presignGet: fail,
    headObject: fail,
    putObject: fail,
    deleteObject: async () => undefined,
  }
}

export function createListingImagesModule(deps: ListingImagesModuleDeps = {}) {
  const config = deps.config ?? loadConfig()
  const repository = createListingImagesRepository()
  const storage =
    deps.storage ?? (config.storage ? getStorageService(config) : unavailableStorage())
  const listingsService = deps.listingsService ?? getListingsService({ config, storage })
  const service = createListingImagesService({
    repository,
    listingsService,
    storage,
    config,
  })
  const controller = createListingImagesController({ service })
  return createListingImagesRouter({ controller })
}

export * from './listing-images.controller.js'
export * from './listing-images.repository.js'
export * from './listing-images.routes.js'
export * from './listing-images.schema.js'
export * from './listing-images.service.js'
export * from './listing-images.types.js'
