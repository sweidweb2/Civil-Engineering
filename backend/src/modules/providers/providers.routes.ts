import { Router } from 'express'

import { ADMIN_ROLES } from '../../authz/index.js'
import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { validate } from '../../middleware/validate.js'
import type { ProvidersController } from './providers.controller.js'
import {
  createProviderBodySchema,
  listProvidersQuerySchema,
  providerIdParamsSchema,
  updateProviderBodySchema,
} from './providers.schema.js'

export function createProvidersRoutes(controller: ProvidersController): Router {
  const router = Router()

  router.use(authenticate)

  router.get(
    '/',
    authorize(...ADMIN_ROLES),
    validate({ query: listProvidersQuerySchema }),
    controller.list,
  )
  router.get('/owner-candidates', authorize(...ADMIN_ROLES), controller.listOwnerCandidates)
  router.get('/me', authorize('PROVIDER', ...ADMIN_ROLES), controller.getMine)
  router.get('/:id', validate({ params: providerIdParamsSchema }), controller.getById)
  router.post(
    '/',
    authorize(...ADMIN_ROLES),
    validate({ body: createProviderBodySchema }),
    controller.create,
  )
  router.patch(
    '/:id',
    validate({ params: providerIdParamsSchema, body: updateProviderBodySchema }),
    controller.update,
  )

  return router
}
