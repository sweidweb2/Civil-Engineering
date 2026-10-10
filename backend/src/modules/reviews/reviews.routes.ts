import { Router } from 'express'

import { ADMIN_ROLES } from '../../authz/index.js'
import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { validate } from '../../middleware/validate.js'
import type { ReviewsController } from './reviews.controller.js'
import {
  createReviewBodySchema,
  listReviewsQuerySchema,
  listReviewTargetsQuerySchema,
  reviewIdParamsSchema,
  updateReviewBodySchema,
} from './reviews.schema.js'

export function createReviewsRoutes(controller: ReviewsController): Router {
  const router = Router()

  router.use(authenticate)

  router.get(
    '/',
    authorize(...ADMIN_ROLES),
    validate({ query: listReviewsQuerySchema }),
    controller.list,
  )
  router.get(
    '/targets',
    authorize(...ADMIN_ROLES),
    validate({ query: listReviewTargetsQuerySchema }),
    controller.listTargets,
  )
  router.get('/:id', validate({ params: reviewIdParamsSchema }), controller.getById)
  router.post('/', validate({ body: createReviewBodySchema }), controller.create)
  router.patch(
    '/:id',
    validate({ params: reviewIdParamsSchema, body: updateReviewBodySchema }),
    controller.update,
  )
  router.delete('/:id', validate({ params: reviewIdParamsSchema }), controller.remove)

  return router
}
