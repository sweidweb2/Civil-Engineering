import type { NextFunction, Request, Response } from 'express'

import type { WorkersService } from './workers.service.js'

export type WorkersController = {
  list: (req: Request, res: Response, next: NextFunction) => Promise<void>
  getById: (req: Request, res: Response, next: NextFunction) => Promise<void>
  create: (req: Request, res: Response, next: NextFunction) => Promise<void>
  update: (req: Request, res: Response, next: NextFunction) => Promise<void>
  assign: (req: Request, res: Response, next: NextFunction) => Promise<void>
}

export function createWorkersController(service: WorkersService): WorkersController {
  return {
    async list(_req, res, next) {
      try {
        const data = await service.listWorkers()
        res.status(200).json({ data })
      } catch (error) {
        next(error)
      }
    },
    async getById(req, res, next) {
      try {
        const worker = await service.getWorkerById(String(req.params.id))
        res.status(200).json(worker)
      } catch (error) {
        next(error)
      }
    },
    async create(req, res, next) {
      try {
        const worker = await service.createWorker(req.body)
        res.status(201).json(worker)
      } catch (error) {
        next(error)
      }
    },
    async update(req, res, next) {
      try {
        const worker = await service.updateWorker(String(req.params.id), req.body)
        res.status(200).json(worker)
      } catch (error) {
        next(error)
      }
    },
    async assign(req, res, next) {
      try {
        const assignment = await service.assignWorkerToProject(String(req.params.id), req.body)
        res.status(201).json(assignment)
      } catch (error) {
        next(error)
      }
    },
  }
}
