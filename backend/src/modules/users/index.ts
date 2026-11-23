import type { AppConfig } from '../../config/index.js'
import type { StorageService } from '../../storage/index.js'
import { createAvatarUrlResolver } from '../files/avatar-url-resolver.js'
import { getFilesService } from '../files/index.js'
import { createUsersController } from './users.controller.js'
import { createManagerProfilesController } from './users.manager-profile.controller.js'
import { createManagerProfilesRepository } from './users.manager-profile.repository.js'
import { createManagerProfilesRoutes } from './users.manager-profile.routes.js'
import { createManagerProfilesService } from './users.manager-profile.service.js'
import { createUsersRepository } from './users.repository.js'
import { createUsersRoutes } from './users.routes.js'
import {
  createUsersService,
  type UsersAdminOverviewGateway,
  type UsersFilesGateway,
} from './users.service.js'

export type UsersModuleDeps = {
  /** Injected by the composition root; falls back to the files singleton for standalone use. */
  filesService?: UsersFilesGateway
  /** Injected by the composition root; `GET /users/admin-overview` is unavailable without it. */
  adminOverview?: UsersAdminOverviewGateway
  /** With storage, admin user lists include loadable avatar URLs. */
  config?: AppConfig
  storage?: StorageService
}

export function createUsersModule(deps: UsersModuleDeps = {}) {
  const repository = createUsersRepository()
  const service = createUsersService(
    repository,
    deps.filesService ?? getFilesService(),
    deps.adminOverview,
    deps.config && deps.storage ? createAvatarUrlResolver(deps.config, deps.storage) : undefined,
  )
  const controller = createUsersController(service)
  return createUsersRoutes(controller)
}

/** Manager profile routes; mounted at `/manager-profiles` by the composition root. */
export function createManagerProfilesModule() {
  const repository = createManagerProfilesRepository()
  const service = createManagerProfilesService(repository)
  const controller = createManagerProfilesController(service)
  return createManagerProfilesRoutes(controller)
}

export { createManagerProfilesService }
export type { ManagerProfilesService } from './users.manager-profile.service.js'
