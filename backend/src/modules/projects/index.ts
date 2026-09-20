import { createProjectsController } from './projects.controller.js'
import { createProjectsRepository } from './projects.repository.js'
import { createProjectsRoutes } from './projects.routes.js'
import { createProjectsService, type ProjectsService } from './projects.service.js'

let projectsServiceSingleton: ProjectsService | null = null

export function getProjectsService(): ProjectsService {
  if (!projectsServiceSingleton) {
    const repository = createProjectsRepository()
    projectsServiceSingleton = createProjectsService(repository)
  }
  return projectsServiceSingleton
}

export function createProjectsModule() {
  const service = getProjectsService()
  const controller = createProjectsController(service)
  return createProjectsRoutes(controller)
}

export { projectsDomain } from './projects.domain.js'
export type { ProjectsService }
