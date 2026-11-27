import { Router } from 'express'

import { ADMIN_ROLES } from '../../authz/index.js'
import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { idempotent } from '../../middleware/idempotency.js'
import { validate } from '../../middleware/validate.js'
import type { DesignRequestsController } from './design-requests.controller.js'
import {
  designRequestIdParamsSchema,
  listDesignRequestsQuerySchema,
  updateDesignRequestStatusBodySchema,
} from './design-requests.schema.js'

export function createDesignRequestsRoutes(controller: DesignRequestsController): Router {
  const router = Router()

  router.use(authenticate)

  router.get('/designer-contact', authorize('MANAGER'), controller.getDesignerContact)

  router.get(
    '/',
    authorize('MANAGER', ...ADMIN_ROLES),
    validate({ query: listDesignRequestsQuerySchema }),
    controller.list,
  )

  router.get(
    '/:id',
    authorize('MANAGER', ...ADMIN_ROLES),
    validate({ params: designRequestIdParamsSchema }),
    controller.getById,
  )

  // Idempotency after the upload parser so form fields and file bytes are hashed.
  router.post(
    '/',
    authorize('MANAGER'),
    controller.optionalUploadMiddleware,
    idempotent(),
    controller.create,
  )

  router.patch(
    '/:id/status',
    authorize('MANAGER', ...ADMIN_ROLES),
    validate({ params: designRequestIdParamsSchema, body: updateDesignRequestStatusBodySchema }),
    controller.updateStatus,
  )

  router.post(
    '/:id/requirement-file',
    authorize('MANAGER'),
    validate({ params: designRequestIdParamsSchema }),
    controller.responseUploadMiddleware,
    controller.uploadRequirementFile,
  )

  router.post(
    '/:id/response-file',
    authorize(...ADMIN_ROLES),
    validate({ params: designRequestIdParamsSchema }),
    controller.responseUploadMiddleware,
    controller.uploadResponseFile,
  )

  router.delete(
    '/:id',
    authorize('MANAGER', ...ADMIN_ROLES),
    validate({ params: designRequestIdParamsSchema }),
    controller.remove,
  )

  return router
}
