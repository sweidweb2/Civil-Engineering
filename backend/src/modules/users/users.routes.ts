import { Router } from 'express'

import { ADMIN_ROLES } from '../../authz/index.js'
import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { validate } from '../../middleware/validate.js'
import type { UsersController } from './users.controller.js'
import {
  createApprovalBodySchema,
  createUserBodySchema,
  createVerificationBodySchema,
  listApprovalsQuerySchema,
  listLookupQuerySchema,
  listUsersQuerySchema,
  listVerificationsQuerySchema,
  setVerificationBodySchema,
  updateUserBodySchema,
  userIdParamsSchema,
} from './users.schema.js'

export function createUsersRoutes(controller: UsersController): Router {
  const router = Router()

  router.use(authenticate)

  router.get(
    '/',
    authorize(...ADMIN_ROLES),
    validate({ query: listUsersQuerySchema }),
    controller.list,
  )
  router.get(
    '/lookup',
    authorize(...ADMIN_ROLES),
    validate({ query: listLookupQuerySchema }),
    controller.listLookup,
  )
  router.get(
    '/approvals',
    authorize(...ADMIN_ROLES),
    validate({ query: listApprovalsQuerySchema }),
    controller.listApprovals,
  )
  router.post(
    '/approvals',
    authorize(...ADMIN_ROLES),
    validate({ body: createApprovalBodySchema }),
    controller.createApproval,
  )
  router.post(
    '/:id/approve',
    authorize(...ADMIN_ROLES),
    validate({ params: userIdParamsSchema }),
    controller.approve,
  )
  router.post(
    '/:id/unapprove',
    authorize(...ADMIN_ROLES),
    validate({ params: userIdParamsSchema }),
    controller.unapprove,
  )
  router.delete(
    '/:id/approval',
    authorize(...ADMIN_ROLES),
    validate({ params: userIdParamsSchema }),
    controller.deleteApproval,
  )
  router.get(
    '/verifications',
    authorize(...ADMIN_ROLES),
    validate({ query: listVerificationsQuerySchema }),
    controller.listVerifications,
  )
  router.post(
    '/verifications',
    authorize(...ADMIN_ROLES),
    validate({ body: createVerificationBodySchema }),
    controller.createVerification,
  )
  router.post(
    '/:id/verification',
    authorize(...ADMIN_ROLES),
    validate({ params: userIdParamsSchema, body: setVerificationBodySchema }),
    controller.setVerification,
  )
  router.delete(
    '/:id/verification',
    authorize(...ADMIN_ROLES),
    validate({ params: userIdParamsSchema }),
    controller.deleteVerification,
  )
  router.get('/:id', validate({ params: userIdParamsSchema }), controller.getById)
  router.post('/', authorize(...ADMIN_ROLES), validate({ body: createUserBodySchema }), controller.create)
  router.patch(
    '/:id',
    validate({ params: userIdParamsSchema, body: updateUserBodySchema }),
    controller.update,
  )
  router.post(
    '/:id/deactivate',
    authorize(...ADMIN_ROLES),
    validate({ params: userIdParamsSchema }),
    controller.deactivate,
  )

  return router
}
