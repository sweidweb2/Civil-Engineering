import { createCategoriesController } from './categories.controller.js'
import { createCategoriesRepository } from './categories.repository.js'
import { createCategoriesRoutes } from './categories.routes.js'
import { type CategoriesService, createCategoriesService } from './categories.service.js'

let categoriesServiceSingleton: CategoriesService | null = null

/** Shared instance for HTTP module wiring and cross-module lookups. */
export function getCategoriesService(): CategoriesService {
  if (!categoriesServiceSingleton) {
    categoriesServiceSingleton = createCategoriesService(createCategoriesRepository())
  }
  return categoriesServiceSingleton
}

export function createCategoriesModule() {
  const service = getCategoriesService()
  const controller = createCategoriesController(service)
  return createCategoriesRoutes(controller)
}

export { createCategoriesService }
export type { CategoriesService }
