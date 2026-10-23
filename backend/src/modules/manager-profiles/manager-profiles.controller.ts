import type { RequestHandler } from 'express'

import { wrap } from '../../errors/async-handler.js'
import { unauthorized } from '../../errors/app-error.js'
import type { ManagerProfilesService } from './manager-profiles.service.js'

export type ManagerProfilesController = {
  getMine: RequestHandler
  upsertMine: RequestHandler
  deleteMine: RequestHandler
}

function requireUserId(req: { user?: { id?: string } }): string {
  if (!req.user?.id) {
    throw unauthorized()
  }
  return req.user.id
}

export function createManagerProfilesController(
  service: ManagerProfilesService,
): ManagerProfilesController {
  return {
    getMine: wrap(async (req, res) => {
      const data = await service.getMine(requireUserId(req))
      res.status(200).json({ data })
    }),

    upsertMine: wrap(async (req, res) => {
      const data = await service.upsertMine(requireUserId(req), req.body)
      res.status(200).json({ data })
    }),

    deleteMine: wrap(async (req, res) => {
      await service.deleteMine(requireUserId(req))
      res.status(204).send()
    }),
  }
}
