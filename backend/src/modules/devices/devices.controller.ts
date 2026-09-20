import type { NextFunction, Request, Response } from 'express'

import { unauthorized } from '../../errors/app-error.js'
import type { DevicesService } from './devices.service.js'

export type DevicesController = {
  register: (req: Request, res: Response, next: NextFunction) => Promise<void>
  unregister: (req: Request, res: Response, next: NextFunction) => Promise<void>
}

function requireUserId(req: Request): string {
  if (!req.user?.id) {
    throw unauthorized()
  }
  return req.user.id
}

export function createDevicesController(service: DevicesService): DevicesController {
  return {
    async register(req, res, next) {
      try {
        const userId = requireUserId(req)
        const device = await service.register(userId, req.body)
        res.status(201).json({
          id: device.id,
          token: device.token,
          platform: device.platform,
          updatedAt: device.updatedAt,
        })
      } catch (error) {
        next(error)
      }
    },

    async unregister(req, res, next) {
      try {
        const userId = requireUserId(req)
        await service.unregister(userId, req.body)
        res.status(204).send()
      } catch (error) {
        next(error)
      }
    },
  }
}
