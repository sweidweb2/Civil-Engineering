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

export type ProjectsRouterDeps = {
  service: ProjectsService
}

/** Builds a fresh service. The composition root calls this once per app. */
export function buildProjectsService(deps: ProjectsModuleDeps = {}): ProjectsService {
  const config = deps.config ?? loadConfig()
  const storage = deps.storage ?? (config.storage ? getStorageService(config) : undefined)
  return createProjectsService(createProjectsRepository(), {
    config,
    storage,
  })
}

/** Standalone/test singleton (first caller's deps win). The app uses `composition-root.ts`. */
export function getProjectsService(deps: ProjectsModuleDeps = {}): ProjectsService {
  projectsServiceSingleton ??= buildProjectsService(deps)
  return projectsServiceSingleton
}

export function createProjectsModule({ service }: ProjectsRouterDeps) {
  const controller = createProjectsController(service)
  return createProjectsRoutes(controller)
}

export type { ProjectsService }
