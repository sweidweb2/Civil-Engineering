import type { AppConfig } from '../../config/index.js'
import { loadConfig } from '../../config/index.js'
import { getStorageService, type StorageService } from '../../storage/index.js'
import { createProjectsController } from './projects.controller.js'
import { createProjectsRepository } from './projects.repository.js'
import { createProjectsRoutes } from './projects.routes.js'
import { createProjectsService, type ProjectsService } from './projects.service.js'

let projectsServiceSingleton: ProjectsService | null = null

export type ProjectsModuleDeps = {
  config?: AppConfig
  storage?: StorageService
}

export function getProjectsService(deps: ProjectsModuleDeps = {}): ProjectsService {
  if (!projectsServiceSingleton) {
    const config = deps.config ?? loadConfig()
    const storage =
      deps.storage ?? (config.storage ? getStorageService(config) : undefined)
    const repository = createProjectsRepository()
    projectsServiceSingleton = createProjectsService(repository, { config, storage })
  }
  return projectsServiceSingleton
}

export function createProjectsModule(deps: ProjectsModuleDeps = {}) {
  const service = getProjectsService(deps)
  const controller = createProjectsController(service)
  return createProjectsRoutes(controller)
}

export { projectsDomain } from './projects.domain.js'
export type { ProjectsService }
