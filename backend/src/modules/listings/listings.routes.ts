import { Router } from 'express'

import { ADMIN_ROLES } from '../../authz/index.js'
import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { idempotent } from '../../middleware/idempotency.js'
import { validate } from '../../middleware/validate.js'
import type { ListingsController } from './listings.controller.js'
import {
  bulkPriceAdjustBodySchema,
  createListingBodySchema,
  importListingsBodySchema,
  listingIdParamsSchema,
  listListingsQuerySchema,
  updateListingBodySchema,
} from './listings.schema.js'

export function createListingsRoutes(controller: ListingsController): Router {
  const router = Router()

  router.use(authenticate)

  router.get(
    '/',
    authorize('SUPER', 'ADMIN', 'MANAGER', 'PROVIDER'),
    validate({ query: listListingsQuerySchema }),
    controller.list,
  )
  router.post(
    '/bulk-price-adjust',
    authorize(...ADMIN_ROLES, 'PROVIDER'),
    validate({ body: bulkPriceAdjustBodySchema }),
    controller.bulkAdjustPrices,
  )
  router.post(
    '/import',
    authorize(...ADMIN_ROLES, 'PROVIDER'),
    validate({ body: importListingsBodySchema }),
    controller.importListings,
  )
  router.get(
    '/:id',
    authorize('SUPER', 'ADMIN', 'MANAGER', 'PROVIDER'),
    validate({ params: listingIdParamsSchema }),
    controller.getById,
  )
  router.post(
    '/',
    authorize(...ADMIN_ROLES, 'PROVIDER'),
    idempotent(),
    validate({ body: createListingBodySchema }),
    controller.create,
  )
  router.patch(
    '/:id',
    authorize(...ADMIN_ROLES, 'PROVIDER'),
    validate({ params: listingIdParamsSchema, body: updateListingBodySchema }),
    controller.update,
  )
  router.delete(
    '/:id',
    authorize(...ADMIN_ROLES, 'PROVIDER'),
    validate({ params: listingIdParamsSchema }),
    controller.remove,
  )

  return router
}
