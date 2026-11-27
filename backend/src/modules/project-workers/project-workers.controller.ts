import type { NextFunction, Request, Response } from 'express'

import { parseAuthActor } from '../../auth/auth-actor.js'
import type { ProjectWorkersService } from './project-workers.service.js'

export type ProjectWorkersController = {
  listByProject: (req: Request, res: Response, next: NextFunction) => Promise<void>
  invite: (req: Request, res: Response, next: NextFunction) => Promise<void>
  remove: (req: Request, res: Response, next: NextFunction) => Promise<void>
  listMine: (req: Request, res: Response, next: NextFunction) => Promise<void>
  getMine: (req: Request, res: Response, next: NextFunction) => Promise<void>
  accept: (req: Request, res: Response, next: NextFunction) => Promise<void>
  reject: (req: Request, res: Response, next: NextFunction) => Promise<void>
}

export function createProjectWorkersController(
  service: ProjectWorkersService,
): ProjectWorkersController {
  return {
    async listByProject(req, res, next) {
      try {
        const result = await service.listByProject(
          String(req.params.projectId),
          req.query as never,
          parseAuthActor(req),
        )
        res.status(200).json(result)
      } catch (error) {
        next(error)
      }
    },
    async invite(req, res, next) {
      try {
        const data = await service.invite(
          String(req.params.projectId),
          req.body,
          parseAuthActor(req),
        )
        res.status(201).json({ data })
      } catch (error) {
        next(error)
      }
    },
    async remove(req, res, next) {
      try {
        await service.remove(
          String(req.params.projectId),
          String(req.params.id),
          parseAuthActor(req),
        )
        res.status(204).send()
      } catch (error) {
        next(error)
      }
    },
    async listMine(req, res, next) {
      try {
        const result = await service.listMine(req.query as never, parseAuthActor(req))
        res.status(200).json(result)
      } catch (error) {
        next(error)
      }
    },
    async getMine(req, res, next) {
      try {
        const data = await service.getMine(String(req.params.projectId), parseAuthActor(req))
        res.status(200).json({ data })
      } catch (error) {
        next(error)
      }
    },
    async accept(req, res, next) {
      try {
        const data = await service.accept(String(req.params.projectId), parseAuthActor(req))
        res.status(200).json({ data })
      } catch (error) {
        next(error)
      }
    },
    async reject(req, res, next) {
      try {
        const data = await service.reject(String(req.params.projectId), parseAuthActor(req))
        res.status(200).json({ data })
      } catch (error) {
        next(error)
      }
    },
  }
}
