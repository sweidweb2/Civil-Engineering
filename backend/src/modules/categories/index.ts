import type { AppConfig } from '../../config/index.js'
import type { StorageService } from '../../storage/index.js'
import type { FilesService } from '../files/files.service.js'
import { createCategoriesController } from './categories.controller.js'
import { createCategoriesRepository } from './categories.repository.js'
import { createCategoriesRoutes } from './categories.routes.js'
import {
  type CategoriesService,
  type CategoriesServiceDeps,
  createCategoriesService,
} from './categories.service.js'

export type CategoriesModuleDeps = {
  config?: AppConfig
  storage?: StorageService
  filesService?: FilesService
  service?: CategoriesService
}

let categoriesServiceSingleton: CategoriesService | null = null

export function buildCategoriesService(
  deps: Omit<CategoriesServiceDeps, 'repository'> = {},
): CategoriesService {
  return createCategoriesService({
    repository: createCategoriesRepository(),
    filesService: deps.filesService,
    storage: deps.storage,
    config: deps.config,
  })
}

/** Shared instance for HTTP module wiring and cross-module lookups. */
export function getCategoriesService(deps: CategoriesModuleDeps = {}): CategoriesService {
  if (!categoriesServiceSingleton) {
    categoriesServiceSingleton =
      deps.service ??
      buildCategoriesService({
        filesService: deps.filesService,
        storage: deps.storage,
        config: deps.config,
      })
  }
  return categoriesServiceSingleton
}

export function createCategoriesModule(deps: CategoriesModuleDeps = {}) {
  const service = deps.service ?? getCategoriesService(deps)
  const controller = createCategoriesController(service)
  return createCategoriesRoutes(controller)
}

export { createCategoriesService }
export type { CategoriesService }
