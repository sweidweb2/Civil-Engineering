import type { AppConfig } from '../../config/index.js'
import type { StorageService } from '../../storage/index.js'
import type { DesignOffersService } from '../design-offers/index.js'
import type { FilesService } from '../files/files.service.js'
import { createNotificationsRepository } from '../notifications/notifications.repository.js'
import { createDesignRequestsController } from './design-requests.controller.js'
import { createDesignRequestsRepository } from './design-requests.repository.js'
import { createDesignRequestsRoutes } from './design-requests.routes.js'
import {
  createDesignRequestsService,
  type DesignRequestsService,
} from './design-requests.service.js'

export type DesignRequestsModuleDeps = {
  config?: AppConfig
  storage?: StorageService
  filesService?: FilesService
  designOffers?: DesignOffersService
  service?: DesignRequestsService
}

export function buildDesignRequestsService(
  deps: DesignRequestsModuleDeps = {},
): DesignRequestsService {
  return createDesignRequestsService({
    repository: createDesignRequestsRepository(),
    notifications: createNotificationsRepository(),
    filesService: deps.filesService,
    storage: deps.storage,
    config: deps.config,
    designOffers: deps.designOffers,
  })
}

export function createDesignRequestsModule(deps: DesignRequestsModuleDeps = {}) {
  const service = deps.service ?? buildDesignRequestsService(deps)
  const controller = createDesignRequestsController(service)
  return createDesignRequestsRoutes(controller)
}

export type { DesignRequestsService }
export { DESIGN_CATEGORIES } from './design-requests.types.js'
