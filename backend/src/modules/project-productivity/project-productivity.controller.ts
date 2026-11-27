import type { NextFunction, Request, Response } from 'express'

import { parseAuthActor } from '../../auth/auth-actor.js'
import type { ProjectProductivityService } from './project-productivity.service.js'

export type ProjectProductivityController = {
  list: (req: Request, res: Response, next: NextFunction) => Promise<void>
  upsert: (req: Request, res: Response, next: NextFunction) => Promise<void>
}

export function createProjectProductivityController(
  service: ProjectProductivityService,
): ProjectProductivityController {
  return {
    async list(req, res, next) {
      try {
        const data = await service.list(String(req.params.projectId), parseAuthActor(req))
        res.status(200).json({ data })
      } catch (error) {
        next(error)
      }
    },
    async upsert(req, res, next) {
      try {
        const data = await service.upsert(
          String(req.params.projectId),
          req.body,
          parseAuthActor(req),
        )
        res.status(200).json({ data })
      } catch (error) {
        next(error)
      }
    },
  }
}
