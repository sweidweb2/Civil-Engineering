import type { NextFunction, Request, Response } from 'express'

import { parseAuthActor } from '../../auth/auth-actor.js'
import type { ProjectTasksService } from './project-tasks.service.js'

export type ProjectTasksController = {
  listByProject: (req: Request, res: Response, next: NextFunction) => Promise<void>
  create: (req: Request, res: Response, next: NextFunction) => Promise<void>
  update: (req: Request, res: Response, next: NextFunction) => Promise<void>
  remove: (req: Request, res: Response, next: NextFunction) => Promise<void>
  listMine: (req: Request, res: Response, next: NextFunction) => Promise<void>
  updateMineStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>
}

export function createProjectTasksController(service: ProjectTasksService): ProjectTasksController {
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
    async create(req, res, next) {
      try {
        const data = await service.create(
          String(req.params.projectId),
          req.body,
          parseAuthActor(req),
        )
        res.status(201).json({ data })
      } catch (error) {
        next(error)
      }
    },
    async update(req, res, next) {
      try {
        const data = await service.update(
          String(req.params.projectId),
          String(req.params.taskId),
          req.body,
          parseAuthActor(req),
        )
        res.status(200).json({ data })
      } catch (error) {
        next(error)
      }
    },
    async remove(req, res, next) {
      try {
        await service.remove(
          String(req.params.projectId),
          String(req.params.taskId),
          parseAuthActor(req),
        )
        res.status(204).send()
      } catch (error) {
        next(error)
      }
    },
    async listMine(req, res, next) {
      try {
        const result = await service.listMine(
          String(req.params.projectId),
          req.query as never,
          parseAuthActor(req),
        )
        res.status(200).json(result)
      } catch (error) {
        next(error)
      }
    },
    async updateMineStatus(req, res, next) {
      try {
        const data = await service.updateMineStatus(
          String(req.params.projectId),
          String(req.params.taskId),
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
