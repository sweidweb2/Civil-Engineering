import {
  getListingsService,
  type ListingsModuleDeps,
  type ListingsService,
} from '../listings/index.js'
import { createReviewsController } from './reviews.controller.js'
import { createReviewsRepository } from './reviews.repository.js'
import { createReviewsRoutes } from './reviews.routes.js'
import { createReviewsService } from './reviews.service.js'

export function createReviewsModule(
  deps: ListingsModuleDeps & { listingsService?: ListingsService } = {},
) {
  const repository = createReviewsRepository()
  const service = createReviewsService(repository, deps.listingsService ?? getListingsService(deps))
  const controller = createReviewsController(service)
  return createReviewsRoutes(controller)
}

export { createReviewsService }
export type { ReviewsService } from './reviews.service.js'
