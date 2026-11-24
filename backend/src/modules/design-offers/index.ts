import type { AppConfig } from '../../config/index.js'
import type { StorageService } from '../../storage/index.js'
import type { FilesService } from '../files/files.service.js'
import { createDesignOffersController } from './design-offers.controller.js'
import { createDesignOffersRepository } from './design-offers.repository.js'
import { createDesignOffersRoutes } from './design-offers.routes.js'
import { createDesignOffersService, type DesignOffersService } from './design-offers.service.js'

export type DesignOffersModuleDeps = {
  config?: AppConfig
  storage?: StorageService
  filesService?: FilesService
  service?: DesignOffersService
}

let designOffersServiceSingleton: DesignOffersService | null = null

export function buildDesignOffersService(deps: DesignOffersModuleDeps = {}): DesignOffersService {
  return createDesignOffersService({
    repository: createDesignOffersRepository(),
    filesService: deps.filesService,
    storage: deps.storage,
    config: deps.config,
  })
}

/** Shared instance for HTTP wiring and cross-module lookups (design-requests). */
export function getDesignOffersService(deps: DesignOffersModuleDeps = {}): DesignOffersService {
  if (!designOffersServiceSingleton) {
    designOffersServiceSingleton = buildDesignOffersService(deps)
  }
  return designOffersServiceSingleton
}

export function createDesignOffersModule(deps: DesignOffersModuleDeps = {}) {
  const service = deps.service ?? getDesignOffersService(deps)
  const controller = createDesignOffersController(service)
  return createDesignOffersRoutes(controller)
}

export type { DesignOffersService }
