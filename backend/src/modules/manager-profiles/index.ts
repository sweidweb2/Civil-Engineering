import { createManagerProfilesController } from './manager-profiles.controller.js'
import { createManagerProfilesRepository } from './manager-profiles.repository.js'
import { createManagerProfilesRoutes } from './manager-profiles.routes.js'
import { createManagerProfilesService } from './manager-profiles.service.js'

export function createManagerProfilesModule() {
  const repository = createManagerProfilesRepository()
  const service = createManagerProfilesService(repository)
  const controller = createManagerProfilesController(service)
  return createManagerProfilesRoutes(controller)
}

export { managerProfilesDomain } from './manager-profiles.domain.js'
export { createManagerProfilesService }
export type { ManagerProfilesService } from './manager-profiles.service.js'
