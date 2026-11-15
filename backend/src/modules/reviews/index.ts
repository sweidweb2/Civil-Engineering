import {
  getListingsService,
  type ListingsModuleDeps,
  type ListingsService,
} from '../listings/index.js'
import { createReviewsController } from './reviews.controller.js'
import { createReviewsRepository } from './reviews.repository.js'
import { createReviewsRoutes } from './reviews.routes.js'
import { createReviewsService, type ReviewsService } from './reviews.service.js'

export type ReviewsModuleDeps = ListingsModuleDeps & {
  listingsService?: ListingsService
  /** Injected by the composition root so other modules can share the same instance. */
  service?: ReviewsService
}

/** Builds a fresh service. The composition root calls this once per app. */
export function buildReviewsService(deps: ReviewsModuleDeps = {}): ReviewsService {
  return createReviewsService(
    createReviewsRepository(),
    deps.listingsService ?? getListingsService(deps),
  )
}

export function createReviewsModule(deps: ReviewsModuleDeps = {}) {
  const service = deps.service ?? buildReviewsService(deps)
  const controller = createReviewsController(service)
  return createReviewsRoutes(controller)
}

export { createReviewsService }
export type { ReviewsService } from './reviews.service.js'
