import type { RequestHandler } from 'express'

import { parseAuthActor } from '../../auth/auth-actor.js'
import { wrap } from '../../errors/async-handler.js'
import { validateBody, validateParams, validateQuery } from '../../middleware/validate.js'
import { uuidSchema } from '../../schemas/index.js'
import {
  broadcastNotificationBodySchema,
  createNotificationBodySchema,
  listNotificationsQuerySchema,
  updateNotificationBodySchema,
  type ListNotificationsQuery,
} from './notifications.schema.js'
import type { NotificationsService } from './notifications.service.js'

export type NotificationsController = {
  listNotifications: RequestHandler
  getNotification: RequestHandler
  countUnread: RequestHandler
  createNotification: RequestHandler
  broadcastNotification: RequestHandler
  updateNotification: RequestHandler
  markAsRead: RequestHandler
  markAsUnread: RequestHandler
  softDelete: RequestHandler
  hardDelete: RequestHandler
  restore: RequestHandler
}

export type NotificationsControllerDeps = {
  service: NotificationsService
}

export function createNotificationsController(
  deps: NotificationsControllerDeps,
): NotificationsController {
  const { service } = deps

  return {
    listNotifications: wrap(async (req, res) => {
      await validateQuery(req, listNotificationsQuerySchema)
      const actor = parseAuthActor(req)
      const query = req.query as unknown as ListNotificationsQuery
      const result = await service.listNotifications(actor, query)
      res.json({
        data: result.notifications,
        meta: {
          page: query.page,
          limit: query.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / query.limit),
        },
      })
    }),

    getNotification: wrap(async (req, res) => {
      await validateParams(req, { id: uuidSchema })
      const actor = parseAuthActor(req)
      const notification = await service.getNotification(actor, String(req.params.id))
      res.json({ data: notification })
    }),

    countUnread: wrap(async (req, res) => {
      const actor = parseAuthActor(req)
      const count = await service.countUnread(actor)
      res.json({ data: { count } })
    }),

    createNotification: wrap(async (req, res) => {
      await validateBody(req, createNotificationBodySchema)
      const actor = parseAuthActor(req)
      const notification = await service.createNotification(actor, req.body)
      res.status(201).json({ data: notification })
    }),

    broadcastNotification: wrap(async (req, res) => {
      await validateBody(req, broadcastNotificationBodySchema)
      const actor = parseAuthActor(req)
      const result = await service.broadcastNotification(actor, req.body)
      res.status(201).json({ data: result })
    }),

    updateNotification: wrap(async (req, res) => {
      await validateParams(req, { id: uuidSchema })
      await validateBody(req, updateNotificationBodySchema)
      const actor = parseAuthActor(req)
      const notification = await service.updateNotification(actor, String(req.params.id), req.body)
      res.json({ data: notification })
    }),

    markAsRead: wrap(async (req, res) => {
      await validateParams(req, { id: uuidSchema })
      const actor = parseAuthActor(req)
      const notification = await service.markAsRead(actor, String(req.params.id))
      res.json({ data: notification })
    }),

    markAsUnread: wrap(async (req, res) => {
      await validateParams(req, { id: uuidSchema })
      const actor = parseAuthActor(req)
      const notification = await service.markAsUnread(actor, String(req.params.id))
      res.json({ data: notification })
    }),

    softDelete: wrap(async (req, res) => {
      await validateParams(req, { id: uuidSchema })
      const actor = parseAuthActor(req)
      const notification = await service.softDelete(actor, String(req.params.id))
      res.json({ data: notification })
    }),

    hardDelete: wrap(async (req, res) => {
      await validateParams(req, { id: uuidSchema })
      const actor = parseAuthActor(req)
      await service.hardDelete(actor, String(req.params.id))
      res.status(204).send()
    }),

    restore: wrap(async (req, res) => {
      await validateParams(req, { id: uuidSchema })
      const actor = parseAuthActor(req)
      const notification = await service.restore(actor, String(req.params.id))
      res.json({ data: notification })
    }),
  }
}
