import type { AppConfig } from '../../config/index.js'
import type { StorageService } from '../../storage/index.js'
import { createAvatarUrlResolver } from '../files/avatar-url-resolver.js'
import { createWorkersController } from './workers.controller.js'
import { createWorkersRepository } from './workers.repository.js'
import { createWorkersRoutes } from './workers.routes.js'
import { createWorkersService, type WorkersService } from './workers.service.js'

export type WorkersModuleDeps = {
  config?: AppConfig
  storage?: StorageService
}

export function createWorkersModule(deps: WorkersModuleDeps = {}) {
  const repository = createWorkersRepository()
  const service = createWorkersService(repository, {
    resolveAvatarUrls:
      deps.config && deps.storage ? createAvatarUrlResolver(deps.config, deps.storage) : undefined,
  })
  const controller = createWorkersController(service)
  return createWorkersRoutes(controller)
}

export { createWorkersService }
export type { WorkersService }
