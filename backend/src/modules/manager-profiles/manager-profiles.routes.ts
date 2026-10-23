import { Router } from 'express'

import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { validate } from '../../middleware/validate.js'
import type { ManagerProfilesController } from './manager-profiles.controller.js'
import { upsertManagerProfileBodySchema } from './manager-profiles.schema.js'

export function createManagerProfilesRoutes(controller: ManagerProfilesController): Router {
  const router = Router()

  router.use(authenticate)
  router.use(authorize('MANAGER'))

  router.get('/me', controller.getMine)
  router.put('/me', validate({ body: upsertManagerProfileBodySchema }), controller.upsertMine)
  router.delete('/me', controller.deleteMine)

  return router
}
