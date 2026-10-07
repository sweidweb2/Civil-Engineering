import { Router } from 'express'
import { z } from 'zod'

import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import { resourceIdSchema } from '../../schemas/index.js'
import type { NotificationsController } from './notifications.controller.js'
import {
  broadcastNotificationBodySchema,
  createNotificationBodySchema,
  listNotificationsQuerySchema,
  updateNotificationBodySchema,
} from './notifications.schema.js'

const notificationIdParamsSchema = z.object({
  id: resourceIdSchema,
})

export type NotificationsRouterDeps = {
  controller: NotificationsController
}

export function createNotificationsRouter(deps: NotificationsRouterDeps): Router {
  const { controller } = deps
  const router = Router()

  router.get(
    '/',
    authenticate,
    validate({ query: listNotificationsQuerySchema }),
    controller.listNotifications,
  )
  router.get('/unread-count', authenticate, controller.countUnread)
  router.get(
    '/:id',
    authenticate,
    validate({ params: notificationIdParamsSchema }),
    controller.getNotification,
  )
  router.post(
    '/',
    authenticate,
    validate({ body: createNotificationBodySchema }),
    controller.createNotification,
  )
  router.post(
    '/broadcast',
    authenticate,
    validate({ body: broadcastNotificationBodySchema }),
    controller.broadcastNotification,
  )
  router.patch(
    '/:id',
    authenticate,
    validate({ params: notificationIdParamsSchema, body: updateNotificationBodySchema }),
    controller.updateNotification,
  )
  router.post(
    '/:id/read',
    authenticate,
    validate({ params: notificationIdParamsSchema }),
    controller.markAsRead,
  )
  router.post(
    '/:id/unread',
    authenticate,
    validate({ params: notificationIdParamsSchema }),
    controller.markAsUnread,
  )
  router.delete(
    '/:id/soft',
    authenticate,
    validate({ params: notificationIdParamsSchema }),
    controller.softDelete,
  )
  router.delete(
    '/:id/hard',
    authenticate,
    validate({ params: notificationIdParamsSchema }),
    controller.hardDelete,
  )
  router.post(
    '/:id/restore',
    authenticate,
    validate({ params: notificationIdParamsSchema }),
    controller.restore,
  )

  return router
}
