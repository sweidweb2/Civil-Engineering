import type { AppConfig } from '../../config/index.js'
import { loadConfig } from '../../config/index.js'
import { getStorageService, type StorageService } from '../../storage/index.js'
import { getCategoriesService } from '../categories/index.js'
import { getInputTypesService } from '../input-types/index.js'
import type { ListingsService } from '../listings/index.js'
import type { StepsService } from '../steps/index.js'
import { createProjectsController } from './projects.controller.js'
import { createProjectsRepository } from './projects.repository.js'
import { createProjectsRoutes } from './projects.routes.js'
import { createProjectsService, type ProjectsService } from './projects.service.js'
import { createProjectSteppersController } from './projects.steppers.controller.js'
import { createProjectSteppersRepository } from './projects.steppers.repository.js'
import {
  createProjectSteppersService,
  type ProjectSteppersFilesGateway,
} from './projects.steppers.service.js'

let projectsServiceSingleton: ProjectsService | null = null

export type ProjectsModuleDeps = {
  config?: AppConfig
  storage?: StorageService
  stepsService?: Pick<StepsService, 'assignActiveToProject'>
}

/**
 * Router wiring needs a files gateway and a built service. Both are injected by the
 * composition root (`composition-root.ts`) because the files module depends on projects
 * (no import cycle here).
 */
export type ProjectsRouterDeps = {
  service: ProjectsService
  files: ProjectSteppersFilesGateway
  listings: Pick<ListingsService, 'getListingSnapshot' | 'getListingSnapshots'>
}

/** Builds a fresh service. The composition root calls this once per app. */
export function buildProjectsService(deps: ProjectsModuleDeps = {}): ProjectsService {
  const config = deps.config ?? loadConfig()
  const storage = deps.storage ?? (config.storage ? getStorageService(config) : undefined)
  return createProjectsService(createProjectsRepository(), {
    config,
    storage,
    stepsService: deps.stepsService,
  })
}

/** Standalone/test singleton (first caller's deps win). The app uses `composition-root.ts`. */
export function getProjectsService(deps: ProjectsModuleDeps = {}): ProjectsService {
  projectsServiceSingleton ??= buildProjectsService(deps)
  return projectsServiceSingleton
}

export function createProjectsModule(deps: ProjectsRouterDeps) {
  const service = deps.service
  const controller = createProjectsController(service)
  const steppersService = createProjectSteppersService(
    createProjectSteppersRepository(),
    service,
    getInputTypesService(),
    deps.files,
    getCategoriesService(),
    deps.listings,
  )
  const steppersController = createProjectSteppersController(steppersService)
  return createProjectsRoutes(controller, steppersController)
}

export type { ProjectsService }
export type { ProjectSteppersFilesGateway }
