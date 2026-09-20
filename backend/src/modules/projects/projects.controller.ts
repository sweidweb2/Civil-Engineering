import type { NextFunction, Request, Response } from 'express'

import { unauthorized } from '../../errors/app-error.js'
import type { ProjectsService } from './projects.service.js'

export type ProjectsController = {
  list: (req: Request, res: Response, next: NextFunction) => Promise<void>
  getById: (req: Request, res: Response, next: NextFunction) => Promise<void>
  create: (req: Request, res: Response, next: NextFunction) => Promise<void>
  update: (req: Request, res: Response, next: NextFunction) => Promise<void>
  archive: (req: Request, res: Response, next: NextFunction) => Promise<void>
}

function requireActor(req: Request) {
  if (!req.user) {
    throw unauthorized()
  }
  return { id: req.user.id, roles: req.user.roles }
}

export function createProjectsController(service: ProjectsService): ProjectsController {
  return {
    async list(_req, res, next) {
      try {
        const data = await service.listProjects()
        res.status(200).json({ data })
      } catch (error) {
        next(error)
      }
    },
    async getById(req, res, next) {
      try {
        const actor = requireActor(req)
        const project = await service.assertAccessible(String(req.params.id), actor)
        res.status(200).json(project)
      } catch (error) {
        next(error)
      }
    },
    async create(req, res, next) {
      try {
        const actor = requireActor(req)
        const project = await service.createProject(req.body, actor.id)
        res.status(201).json(project)
      } catch (error) {
        next(error)
      }
    },
    async update(req, res, next) {
      try {
        const actor = requireActor(req)
        const project = await service.updateProject(String(req.params.id), req.body, actor)
        res.status(200).json(project)
      } catch (error) {
        next(error)
      }
    },
    async archive(req, res, next) {
      try {
        const actor = requireActor(req)
        const project = await service.archiveProject(String(req.params.id), actor)
        res.status(200).json(project)
      } catch (error) {
        next(error)
      }
    },
  }
}
