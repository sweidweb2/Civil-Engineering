import type { NextFunction, Request, Response } from 'express'

import { unauthorized } from '../../errors/app-error.js'
import type { ManagerProfilesService } from './manager-profiles.service.js'

export type ManagerProfilesController = {
  getMine: (req: Request, res: Response, next: NextFunction) => Promise<void>
  createMine: (req: Request, res: Response, next: NextFunction) => Promise<void>
  updateMine: (req: Request, res: Response, next: NextFunction) => Promise<void>
  upsertMine: (req: Request, res: Response, next: NextFunction) => Promise<void>
  deleteMine: (req: Request, res: Response, next: NextFunction) => Promise<void>
}

function requireUserId(req: Request): string {
  if (!req.user?.id) {
    throw unauthorized()
  }
  return req.user.id
}

export function createManagerProfilesController(
  service: ManagerProfilesService,
): ManagerProfilesController {
  return {
    async getMine(req, res, next) {
      try {
        const data = await service.getMine(requireUserId(req))
        res.status(200).json({ data })
      } catch (error) {
        next(error)
      }
    },

    async createMine(req, res, next) {
      try {
        const data = await service.createMine(requireUserId(req), req.body)
        res.status(201).json({ data })
      } catch (error) {
        next(error)
      }
    },

    async updateMine(req, res, next) {
      try {
        const data = await service.updateMine(requireUserId(req), req.body)
        res.status(200).json({ data })
      } catch (error) {
        next(error)
      }
    },

    async upsertMine(req, res, next) {
      try {
        const data = await service.upsertMine(requireUserId(req), req.body)
        res.status(200).json({ data })
      } catch (error) {
        next(error)
      }
    },

    async deleteMine(req, res, next) {
      try {
        await service.deleteMine(requireUserId(req))
        res.status(204).send()
      } catch (error) {
        next(error)
      }
    },
  }
}
