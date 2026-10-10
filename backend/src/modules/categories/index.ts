import { createCategoriesController } from './categories.controller.js'
import { createCategoriesRepository } from './categories.repository.js'
import { createCategoriesRoutes } from './categories.routes.js'
import { createCategoriesService } from './categories.service.js'

export function createCategoriesModule() {
  const repository = createCategoriesRepository()
  const service = createCategoriesService(repository)
  const controller = createCategoriesController(service)
  return createCategoriesRoutes(controller)
}

export { categoriesDomain } from './categories.domain.js'
export { createCategoriesService }
export type { CategoriesService } from './categories.service.js'
