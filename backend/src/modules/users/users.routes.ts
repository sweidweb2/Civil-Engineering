import { Router } from 'express'

import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { validate } from '../../middleware/validate.js'
import type { UsersController } from './users.controller.js'
import {
  createUserBodySchema,
  listUsersQuerySchema,
  updateUserBodySchema,
  userIdParamsSchema,
} from './users.schema.js'

export function createUsersRoutes(controller: UsersController): Router {
  const router = Router()

  router.get(
    '/',
    authenticate,
    authorize('SUPER', 'ADMIN'),
    validate({ query: listUsersQuerySchema }),
    controller.list,
  )
  
  router.get(
    '/:id',
    authenticate,
    authorize('SUPER', 'ADMIN'),
    validate({ params: userIdParamsSchema }),
    controller.getById,
  )
  
  router.post(
    '/',
    authenticate,
    authorize('SUPER', 'ADMIN'),
    validate({ body: createUserBodySchema }),
    controller.create,
  )
  
  router.patch(
    '/:id',
    authenticate,
    authorize('SUPER', 'ADMIN'),
    validate({ params: userIdParamsSchema, body: updateUserBodySchema }),
    controller.update,
  )
  
  router.post(
    '/:id/deactivate',
    authenticate,
    authorize('SUPER', 'ADMIN'),
    validate({ params: userIdParamsSchema }),
    controller.deactivate,
  )

  return router
}
