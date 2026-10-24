import { Router } from 'express'

import { ADMIN_ROLES } from '../../authz/index.js'
import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { validate } from '../../middleware/validate.js'
import type { CategoriesController } from './categories.controller.js'
import {
  categoryIdParamsSchema,
  createCategoryBodySchema,
  listCategoriesQuerySchema,
  updateCategoryBodySchema,
} from './categories.schema.js'

export function createCategoriesRoutes(controller: CategoriesController): Router {
  const router = Router()

  router.use(authenticate)

  router.get(
    '/',
    authorize('SUPER', 'ADMIN', 'MANAGER', 'PROVIDER'),
    validate({ query: listCategoriesQuerySchema }),
    controller.list,
  )
  router.get(
    '/:id',
    authorize('SUPER', 'ADMIN', 'MANAGER', 'PROVIDER'),
    validate({ params: categoryIdParamsSchema }),
    controller.getById,
  )
  router.post('/', authorize(...ADMIN_ROLES), validate({ body: createCategoryBodySchema }), controller.create)
  router.patch(
    '/:id',
    authorize(...ADMIN_ROLES),
    validate({ params: categoryIdParamsSchema, body: updateCategoryBodySchema }),
    controller.update,
  )
  router.delete(
    '/:id',
    authorize(...ADMIN_ROLES),
    validate({ params: categoryIdParamsSchema }),
    controller.remove,
  )

  return router
}
