import { Router } from 'express'

import { ADMIN_ROLES } from '../../authz/index.js'
import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { validate } from '../../middleware/validate.js'
import type { DesignOffersController } from './design-offers.controller.js'
import {
  createDesignOfferBodySchema,
  designOfferIdParamsSchema,
  listDesignOffersQuerySchema,
  updateDesignOfferBodySchema,
} from './design-offers.schema.js'

export function createDesignOffersRoutes(controller: DesignOffersController): Router {
  const router = Router()

  router.use(authenticate)

  router.get(
    '/',
    authorize('MANAGER', ...ADMIN_ROLES),
    validate({ query: listDesignOffersQuerySchema }),
    controller.list,
  )

  router.get(
    '/:id',
    authorize('MANAGER', ...ADMIN_ROLES),
    validate({ params: designOfferIdParamsSchema }),
    controller.getById,
  )

  router.post(
    '/',
    authorize(...ADMIN_ROLES),
    validate({ body: createDesignOfferBodySchema }),
    controller.create,
  )

  router.patch(
    '/:id',
    authorize(...ADMIN_ROLES),
    validate({ params: designOfferIdParamsSchema, body: updateDesignOfferBodySchema }),
    controller.update,
  )

  router.post(
    '/:id/image',
    authorize(...ADMIN_ROLES),
    validate({ params: designOfferIdParamsSchema }),
    controller.imageUploadMiddleware,
    controller.uploadImage,
  )

  router.delete(
    '/:id',
    authorize(...ADMIN_ROLES),
    validate({ params: designOfferIdParamsSchema }),
    controller.remove,
  )

  return router
}
