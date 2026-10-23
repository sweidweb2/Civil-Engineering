import type { AppConfig } from '../../config/index.js'
import { loadConfig } from '../../config/index.js'
import { getStorageService, type StorageService } from '../../storage/index.js'
import { createProjectSteppersControllerForProjects } from '../project-steppers/index.js'
import type { StepsService } from '../steps/index.js'
import { createProjectsController } from './projects.controller.js'
import { createProjectsRepository } from './projects.repository.js'
import { createProjectsRoutes } from './projects.routes.js'
import { createProjectsService, type ProjectsService } from './projects.service.js'

let projectsServiceSingleton: ProjectsService | null = null

export type ProjectsModuleDeps = {
  config?: AppConfig
  storage?: StorageService
  stepsService?: Pick<StepsService, 'assignActiveToProject'>
}

export function getProjectsService(deps: ProjectsModuleDeps = {}): ProjectsService {
  if (!projectsServiceSingleton) {
    const config = deps.config ?? loadConfig()
    const storage =
      deps.storage ?? (config.storage ? getStorageService(config) : undefined)
    const repository = createProjectsRepository()
    projectsServiceSingleton = createProjectsService(repository, {
      config,
      storage,
      stepsService: deps.stepsService,
    })
  }
  return projectsServiceSingleton
}

export function createProjectsModule(deps: ProjectsModuleDeps = {}) {
  const service = getProjectsService(deps)
  const controller = createProjectsController(service)
  const steppersController = createProjectSteppersControllerForProjects(service)
  return createProjectsRoutes(controller, steppersController)
}

export { projectsDomain } from './projects.domain.js'
export type { ProjectsService }
