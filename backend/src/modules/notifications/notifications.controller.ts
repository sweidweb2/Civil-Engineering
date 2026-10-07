import type { Request, Response } from 'express'

import { parseAuthActor } from '../../auth/auth-actor.js'
import { wrap } from '../../errors/async-handler.js'
import { validateBody, validateParams, validateQuery } from '../../middleware/validate.js'
import { uuidSchema } from '../../schemas/index.js'
import {
  broadcastNotificationBodySchema,
  createNotificationBodySchema,
  listNotificationsQuerySchema,
  updateNotificationBodySchema,
} from './notifications.schema.js'
import type { NotificationsService } from './notifications.service.js'

export type NotificationsController = {
  listNotifications: (req: Request, res: Response) => Promise<void>
  getNotification: (req: Request, res: Response) => Promise<void>
  countUnread: (req: Request, res: Response) => Promise<void>
  createNotification: (req: Request, res: Response) => Promise<void>
  broadcastNotification: (req: Request, res: Response) => Promise<void>
  updateNotification: (req: Request, res: Response) => Promise<void>
  markAsRead: (req: Request, res: Response) => Promise<void>
  markAsUnread: (req: Request, res: Response) => Promise<void>
  softDelete: (req: Request, res: Response) => Promise<void>
  hardDelete: (req: Request, res: Response) => Promise<void>
  restore: (req: Request, res: Response) => Promise<void>
}

export type NotificationsControllerDeps = {
  service: NotificationsService
}

export function createNotificationsController(
  deps: NotificationsControllerDeps
): NotificationsController {
  const { service } = deps

  return {
    listNotifications: wrap(async (req, res) => {
      await validateQuery(req, listNotificationsQuerySchema)
      const actor = parseAuthActor(req)
      const result = await service.listNotifications(actor, req.query)
      res.json({
        data: result.notifications,
        meta: {
          page: req.query.page ?? 1,
          limit: req.query.limit ?? 20,
          total: result.total,
          totalPages: Math.ceil(result.total / (req.query.limit ?? 20)),
        },
      })
    }),

    getNotification: wrap(async (req, res) => {
      await validateParams(req, { id: uuidSchema })
      const actor = parseAuthActor(req)
      const notification = await service.getNotification(actor, req.params.id)
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
      const notification = await service.updateNotification(actor, req.params.id, req.body)
      res.json({ data: notification })
    }),

    markAsRead: wrap(async (req, res) => {
      await validateParams(req, { id: uuidSchema })
      const actor = parseAuthActor(req)
      const notification = await service.markAsRead(actor, req.params.id)
      res.json({ data: notification })
    }),

    markAsUnread: wrap(async (req, res) => {
      await validateParams(req, { id: uuidSchema })
      const actor = parseAuthActor(req)
      const notification = await service.markAsUnread(actor, req.params.id)
      res.json({ data: notification })
    }),

    softDelete: wrap(async (req, res) => {
      await validateParams(req, { id: uuidSchema })
      const actor = parseAuthActor(req)
      const notification = await service.softDelete(actor, req.params.id)
      res.json({ data: notification })
    }),

    hardDelete: wrap(async (req, res) => {
      await validateParams(req, { id: uuidSchema })
      const actor = parseAuthActor(req)
      await service.hardDelete(actor, req.params.id)
      res.status(204).send()
    }),

    restore: wrap(async (req, res) => {
      await validateParams(req, { id: uuidSchema })
      const actor = parseAuthActor(req)
      const notification = await service.restore(actor, req.params.id)
      res.json({ data: notification })
    }),
  }
}
