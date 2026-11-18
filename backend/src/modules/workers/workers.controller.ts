import type { RequestHandler } from 'express'

import { unauthorized } from '../../errors/app-error.js'
import { wrap } from '../../errors/async-handler.js'
import type { WorkersService } from './workers.service.js'

export type WorkersController = {
  list: RequestHandler
  getMine: RequestHandler
  getByUserId: RequestHandler
  upsertMine: RequestHandler
  deleteMine: RequestHandler
  requestVerification: RequestHandler
  setVisibility: RequestHandler
}

function requireUser(req: { user?: { id?: string; roles?: string[] } }): {
  id: string
  roles: string[]
} {
  if (!req.user?.id || !req.user.roles) {
    throw unauthorized()
  }
  return { id: req.user.id, roles: req.user.roles }
}

function optionalUser(req: {
  user?: { id?: string; roles?: string[] }
}): { id: string; roles: string[] } | null {
  if (!req.user?.id || !req.user.roles) return null
  return { id: req.user.id, roles: req.user.roles }
}

export function createWorkersController(service: WorkersService): WorkersController {
  return {
    list: wrap(async (req, res) => {
      const result = await service.list(req.query as never, optionalUser(req))
      res.status(200).json(result)
    }),

    getMine: wrap(async (req, res) => {
      const result = await service.getMine(requireUser(req).id)
      res.status(200).json({
        data: result.profile,
        meta: { verificationStatus: result.verificationStatus },
      })
    }),

    getByUserId: wrap(async (req, res) => {
      const data = await service.getByUserId(String(req.params.userId), optionalUser(req))
      res.status(200).json({ data })
    }),

    upsertMine: wrap(async (req, res) => {
      const data = await service.upsertMine(requireUser(req).id, req.body)
      res.status(200).json({ data })
    }),

    deleteMine: wrap(async (req, res) => {
      await service.deleteMine(requireUser(req).id)
      res.status(204).send()
    }),

    requestVerification: wrap(async (req, res) => {
      const data = await service.requestVerification(requireUser(req).id)
      res.status(200).json({ data })
    }),

    setVisibility: wrap(async (req, res) => {
      const actor = requireUser(req)
      const data = await service.setVisibility(String(req.params.userId), req.body, actor)
      res.status(200).json({ data })
    }),
  }
}
