import type { NextFunction, Request, Response } from 'express'

import type { MaterialsService } from './materials.service.js'

export type MaterialsController = {
  list: (req: Request, res: Response, next: NextFunction) => Promise<void>
  getById: (req: Request, res: Response, next: NextFunction) => Promise<void>
  create: (req: Request, res: Response, next: NextFunction) => Promise<void>
  update: (req: Request, res: Response, next: NextFunction) => Promise<void>
  recordMovement: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => Promise<void>
}

export function createMaterialsController(
  service: MaterialsService
): MaterialsController {
  return {
    async list(_req, res, next) {
      try {
        const data = await service.listMaterials()
        res.status(200).json({ data })
      } catch (error) {
        next(error)
      }
    },
    async getById(req, res, next) {
      try {
        const material = await service.getMaterialById(String(req.params.id))
        res.status(200).json(material)
      } catch (error) {
        next(error)
      }
    },
    async create(req, res, next) {
      try {
        const material = await service.createMaterial(req.body)
        res.status(201).json(material)
      } catch (error) {
        next(error)
      }
    },
    async update(req, res, next) {
      try {
        const material = await service.updateMaterial(
          String(req.params.id),
          req.body
        )
        res.status(200).json(material)
      } catch (error) {
        next(error)
      }
    },
    async recordMovement(req, res, next) {
      try {
        const movement = await service.recordStockMovement(
          String(req.params.id),
          req.body
        )
        res.status(201).json(movement)
      } catch (error) {
        next(error)
      }
    },
  }
}
