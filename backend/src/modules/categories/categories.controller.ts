import type { NextFunction, Request, Response } from 'express'

import { parseAuthActor } from '../../auth/auth-actor.js'
import type { ListCategoriesQuery } from './categories.schema.js'
import type { CategoriesService } from './categories.service.js'

export type CategoriesController = {
  list: (req: Request, res: Response, next: NextFunction) => Promise<void>
  getById: (req: Request, res: Response, next: NextFunction) => Promise<void>
  create: (req: Request, res: Response, next: NextFunction) => Promise<void>
  update: (req: Request, res: Response, next: NextFunction) => Promise<void>
  remove: (req: Request, res: Response, next: NextFunction) => Promise<void>
}

export function createCategoriesController(service: CategoriesService): CategoriesController {
  return {
    async list(req, res, next) {
      try {
        const result = await service.listCategories(
          req.query as unknown as ListCategoriesQuery,
          parseAuthActor(req),
        )
        res.status(200).json(result)
      } catch (error) {
        next(error)
      }
    },

    async getById(req, res, next) {
      try {
        const category = await service.getCategoryById(String(req.params.id), parseAuthActor(req))
        res.status(200).json({ data: category })
      } catch (error) {
        next(error)
      }
    },

    async create(req, res, next) {
      try {
        const category = await service.createCategory(req.body, parseAuthActor(req))
        res.status(201).json({ data: category })
      } catch (error) {
        next(error)
      }
    },

    async update(req, res, next) {
      try {
        const category = await service.updateCategory(String(req.params.id), req.body, parseAuthActor(req))
        res.status(200).json({ data: category })
      } catch (error) {
        next(error)
      }
    },

    async remove(req, res, next) {
      try {
        await service.deleteCategory(String(req.params.id), parseAuthActor(req))
        res.status(204).send()
      } catch (error) {
        next(error)
      }
    },
  }
}
