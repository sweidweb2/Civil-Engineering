import { Router } from 'express'

import { authenticate } from '../../middleware/auth.js'
import type { NotificationsController } from './notifications.controller.js'

export type NotificationsRouterDeps = {
  controller: NotificationsController
}

export function createNotificationsRouter(deps: NotificationsRouterDeps): Router {
  const { controller } = deps
  const router = Router()

  router.get('/', authenticate, controller.listNotifications)
  router.get('/unread-count', authenticate, controller.countUnread)
  router.get('/:id', authenticate, controller.getNotification)
  router.post('/', authenticate, controller.createNotification)
  router.post('/broadcast', authenticate, controller.broadcastNotification)
  router.patch('/:id', authenticate, controller.updateNotification)
  router.post('/:id/read', authenticate, controller.markAsRead)
  router.post('/:id/unread', authenticate, controller.markAsUnread)
  router.delete('/:id/soft', authenticate, controller.softDelete)
  router.delete('/:id/hard', authenticate, controller.hardDelete)
  router.post('/:id/restore', authenticate, controller.restore)

  return router
}
