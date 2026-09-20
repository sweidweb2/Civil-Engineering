import type { NextFunction, Request, Response } from 'express'

import type { ProjectsService } from './projects.service.js'

export type ProjectsController = {
  list: (req: Request, res: Response, next: NextFunction) => Promise<void>
  getById: (req: Request, res: Response, next: NextFunction) => Promise<void>
  create: (req: Request, res: Response, next: NextFunction) => Promise<void>
  update: (req: Request, res: Response, next: NextFunction) => Promise<void>
  archive: (req: Request, res: Response, next: NextFunction) => Promise<void>
}

export function createProjectsController(
  service: ProjectsService
): ProjectsController {
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
        const project = await service.getProjectById(String(req.params.id))
        res.status(200).json(project)
      } catch (error) {
        next(error)
      }
    },
    async create(req, res, next) {
      try {
        const ownerId = req.user?.id ?? 'unknown'
        const project = await service.createProject(req.body, ownerId)
        res.status(201).json(project)
      } catch (error) {
        next(error)
      }
    },
    async update(req, res, next) {
      try {
        const project = await service.updateProject(
          String(req.params.id),
          req.body
        )
        res.status(200).json(project)
      } catch (error) {
        next(error)
      }
    },
    async archive(req, res, next) {
      try {
        const project = await service.archiveProject(String(req.params.id))
        res.status(200).json(project)
      } catch (error) {
        next(error)
      }
    },
  }
}
