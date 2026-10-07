import { Router } from 'express'

import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import type { MaterialsController } from './materials.controller.js'
import {
  createMaterialBodySchema,
  listMaterialsQuerySchema,
  materialIdParamsSchema,
  stockMovementBodySchema,
  updateMaterialBodySchema,
} from './materials.schema.js'

export function createMaterialsRoutes(controller: MaterialsController): Router {
  const router = Router()

  router.use(authenticate)

  router.get('/', validate({ query: listMaterialsQuerySchema }), controller.list)
  router.get('/:id', validate({ params: materialIdParamsSchema }), controller.getById)
  router.post('/', validate({ body: createMaterialBodySchema }), controller.create)
  router.patch(
    '/:id',
    validate({ params: materialIdParamsSchema, body: updateMaterialBodySchema }),
    controller.update,
  )
  router.post(
    '/:id/movements',
    validate({ params: materialIdParamsSchema, body: stockMovementBodySchema }),
    controller.recordMovement,
  )

  return router
}
