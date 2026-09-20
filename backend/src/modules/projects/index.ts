import { createProjectsController } from './projects.controller.js'
import { createProjectsRepository } from './projects.repository.js'
import { createProjectsRoutes } from './projects.routes.js'
import { createProjectsService } from './projects.service.js'

export function createProjectsModule() {
  const repository = createProjectsRepository()
  const service = createProjectsService(repository)
  const controller = createProjectsController(service)
  return createProjectsRoutes(controller)
}

export { projectsDomain } from './projects.domain.js'
export type { ProjectsService } from './projects.service.js'
