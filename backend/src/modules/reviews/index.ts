import { createReviewsController } from './reviews.controller.js'
import { createReviewsRepository } from './reviews.repository.js'
import { createReviewsRoutes } from './reviews.routes.js'
import { createReviewsService } from './reviews.service.js'

export function createReviewsModule() {
  const repository = createReviewsRepository()
  const service = createReviewsService(repository)
  const controller = createReviewsController(service)
  return createReviewsRoutes(controller)
}

export { reviewsDomain } from './reviews.domain.js'
export { createReviewsService }
export type { ReviewsService } from './reviews.service.js'
