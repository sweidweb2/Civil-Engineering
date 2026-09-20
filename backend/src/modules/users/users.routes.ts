import { Router } from 'express'

import { validate } from '../../middleware/validate.js'
import type { UsersController } from './users.controller.js'
import {
  createUserBodySchema,
  updateUserBodySchema,
  userIdParamsSchema,
} from './users.schema.js'

export function createUsersRoutes(controller: UsersController): Router {
  const router = Router()

  router.get('/', controller.list)
  router.get('/:id', validate({ params: userIdParamsSchema }), controller.getById)
  router.post('/', validate({ body: createUserBodySchema }), controller.create)
  router.patch(
    '/:id',
    validate({ params: userIdParamsSchema, body: updateUserBodySchema }),
    controller.update
  )
  router.post(
    '/:id/deactivate',
    validate({ params: userIdParamsSchema }),
    controller.deactivate
  )

  return router
}
