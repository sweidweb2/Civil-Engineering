import { Router } from 'express'

import { ADMIN_ROLES } from '../../authz/index.js'
import { authenticate, optionalAuthenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { validate } from '../../middleware/validate.js'
import type { WorkersController } from './workers.controller.js'
import {
  listWorkersQuerySchema,
  setWorkerVisibilityBodySchema,
  upsertWorkerProfileBodySchema,
  workerUserIdParamsSchema,
} from './workers.schema.js'

export function createWorkersRoutes(controller: WorkersController): Router {
  const router = Router()

  // Public marketplace list (guest browse). Invalid tokens still 401.
  router.get(
    '/',
    optionalAuthenticate,
    validate({ query: listWorkersQuerySchema }),
    controller.list,
  )

  // Worker self routes before `/:userId` so "me" is not treated as an id.
  router.get('/me', authenticate, authorize('WORKER'), controller.getMine)
  router.put(
    '/me',
    authenticate,
    authorize('WORKER'),
    validate({ body: upsertWorkerProfileBodySchema }),
    controller.upsertMine,
  )
  router.delete('/me', authenticate, authorize('WORKER'), controller.deleteMine)
  router.post(
    '/me/request-verification',
    authenticate,
    authorize('WORKER'),
    controller.requestVerification,
  )

  router.patch(
    '/:userId/visibility',
    authenticate,
    authorize(...ADMIN_ROLES),
    validate({ params: workerUserIdParamsSchema, body: setWorkerVisibilityBodySchema }),
    controller.setVisibility,
  )

  router.get(
    '/:userId',
    optionalAuthenticate,
    validate({ params: workerUserIdParamsSchema }),
    controller.getByUserId,
  )

  return router
}
