import type { NextFunction, Request, Response } from 'express'

import { parseAuthActor } from '../../auth/auth-actor.js'
import type { ListProjectsQuery } from './projects.schema.js'
import type { ProjectsService } from './projects.service.js'

export type ProjectsController = {
  list: (req: Request, res: Response, next: NextFunction) => Promise<void>
  summary: (req: Request, res: Response, next: NextFunction) => Promise<void>
  timeline: (req: Request, res: Response, next: NextFunction) => Promise<void>
  getById: (req: Request, res: Response, next: NextFunction) => Promise<void>
  create: (req: Request, res: Response, next: NextFunction) => Promise<void>
  update: (req: Request, res: Response, next: NextFunction) => Promise<void>
  archive: (req: Request, res: Response, next: NextFunction) => Promise<void>
}

export function createProjectsController(service: ProjectsService): ProjectsController {
  return {
    async list(req, res, next) {
      try {
        const actor = parseAuthActor(req)
        const query = req.query as unknown as ListProjectsQuery
        const result = await service.listProjects(query, actor)
        res.status(200).json(result)
      } catch (error) {
        next(error)
      }
    },
    async summary(req, res, next) {
      try {
        const actor = parseAuthActor(req)
        const result = await service.getSummary(actor)
        res.status(200).json(result)
      } catch (error) {
        next(error)
      }
    },
    async timeline(req, res, next) {
      try {
        const actor = parseAuthActor(req)
        const result = await service.listTimeline(actor)
        res.status(200).json(result)
      } catch (error) {
        next(error)
      }
    },
    async getById(req, res, next) {
      try {
        const actor = parseAuthActor(req)
        const project = await service.getAccessibleProject(String(req.params.id), actor)
        res.status(200).json({ data: project })
      } catch (error) {
        next(error)
      }
    },
    async create(req, res, next) {
      try {
        const actor = parseAuthActor(req)
        const project = await service.createProject(req.body, actor.id)
        res.status(201).json({ data: project })
      } catch (error) {
        next(error)
      }
    },
    async update(req, res, next) {
      try {
        const actor = parseAuthActor(req)
        const project = await service.updateProject(String(req.params.id), req.body, actor)
        res.status(200).json({ data: project })
      } catch (error) {
        next(error)
      }
    },
    async archive(req, res, next) {
      try {
        const actor = parseAuthActor(req)
        await service.archiveProject(String(req.params.id), actor)
        res.status(204).send()
      } catch (error) {
        next(error)
      }
    },
  }
}
