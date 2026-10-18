import type { RequestHandler } from 'express'

import { parseAuthActor } from '../../auth/auth-actor.js'
import { wrap } from '../../errors/async-handler.js'
import type { ListCategoriesQuery } from './categories.schema.js'
import type { CategoriesService } from './categories.service.js'

export type CategoriesController = {
  list: RequestHandler
  getById: RequestHandler
  create: RequestHandler
  update: RequestHandler
  remove: RequestHandler
}

export function createCategoriesController(service: CategoriesService): CategoriesController {
  return {
    list: wrap(async (req, res) => {
      const result = await service.listCategories(
        req.query as unknown as ListCategoriesQuery,
        parseAuthActor(req),
      )
      res.status(200).json(result)
    }),

    getById: wrap(async (req, res) => {
      const category = await service.getCategoryById(String(req.params.id), parseAuthActor(req))
      res.status(200).json({ data: category })
    }),

    create: wrap(async (req, res) => {
      const category = await service.createCategory(req.body, parseAuthActor(req))
      res.status(201).json({ data: category })
    }),

    update: wrap(async (req, res) => {
      const category = await service.updateCategory(String(req.params.id), req.body, parseAuthActor(req))
      res.status(200).json({ data: category })
    }),

    remove: wrap(async (req, res) => {
      await service.deleteCategory(String(req.params.id), parseAuthActor(req))
      res.status(204).send()
    }),
  }
}
