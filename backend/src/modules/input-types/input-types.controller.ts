import type { RequestHandler } from 'express'

import { parseAuthActor } from '../../auth/auth-actor.js'
import { wrap } from '../../errors/async-handler.js'
import type { ListInputTypesQuery } from './input-types.schema.js'
import type { InputTypesService } from './input-types.service.js'

export type InputTypesController = {
  list: RequestHandler
  getById: RequestHandler
  create: RequestHandler
  update: RequestHandler
  remove: RequestHandler
}

export function createInputTypesController(service: InputTypesService): InputTypesController {
  return {
    list: wrap(async (req, res) => {
      const result = await service.listInputTypes(
        req.query as unknown as ListInputTypesQuery,
        parseAuthActor(req),
      )
      res.status(200).json(result)
    }),

    getById: wrap(async (req, res) => {
      const item = await service.getInputTypeById(String(req.params.id), parseAuthActor(req))
      res.status(200).json({ data: item })
    }),

    create: wrap(async (req, res) => {
      const item = await service.createInputType(req.body, parseAuthActor(req))
      res.status(201).json({ data: item })
    }),

    update: wrap(async (req, res) => {
      const item = await service.updateInputType(String(req.params.id), req.body, parseAuthActor(req))
      res.status(200).json({ data: item })
    }),

    remove: wrap(async (req, res) => {
      await service.deleteInputType(String(req.params.id), parseAuthActor(req))
      res.status(204).send()
    }),
  }
}
