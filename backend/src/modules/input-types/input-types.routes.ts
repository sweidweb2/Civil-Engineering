import { Router } from 'express'

import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { validate } from '../../middleware/validate.js'
import type { InputTypesController } from './input-types.controller.js'
import {
  createInputTypeBodySchema,
  inputTypeIdParamsSchema,
  listInputTypesQuerySchema,
  updateInputTypeBodySchema,
} from './input-types.schema.js'

export function createInputTypesRoutes(controller: InputTypesController): Router {
  const router = Router()

  router.use(authenticate)

  router.get(
    '/',
    authorize('SUPER', 'ADMIN', 'MANAGER'),
    validate({ query: listInputTypesQuerySchema }),
    controller.list,
  )
  router.get(
    '/:id',
    authorize('SUPER', 'ADMIN', 'MANAGER'),
    validate({ params: inputTypeIdParamsSchema }),
    controller.getById,
  )
  router.post(
    '/',
    authorize('SUPER'),
    validate({ body: createInputTypeBodySchema }),
    controller.create,
  )
  router.patch(
    '/:id',
    authorize('SUPER'),
    validate({ params: inputTypeIdParamsSchema, body: updateInputTypeBodySchema }),
    controller.update,
  )
  router.delete(
    '/:id',
    authorize('SUPER'),
    validate({ params: inputTypeIdParamsSchema }),
    controller.remove,
  )

  return router
}
