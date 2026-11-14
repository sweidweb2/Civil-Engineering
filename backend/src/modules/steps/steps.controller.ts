import type { RequestHandler } from 'express'

import { parseAuthActor } from '../../auth/auth-actor.js'
import { wrap } from '../../errors/async-handler.js'
import type { ListStepsQuery } from './steps.schema.js'
import type { StepsService } from './steps.service.js'

export type StepsController = {
  list: RequestHandler
  getById: RequestHandler
  create: RequestHandler
  update: RequestHandler
  remove: RequestHandler
}

export function createStepsController(service: StepsService): StepsController {
  return {
    list: wrap(async (req, res) => {
      const result = await service.listSteps(
        req.query as unknown as ListStepsQuery,
        parseAuthActor(req),
      )
      res.status(200).json(result)
    }),

    getById: wrap(async (req, res) => {
      const step = await service.getStepById(String(req.params.id), parseAuthActor(req))
      res.status(200).json({ data: step })
    }),

    create: wrap(async (req, res) => {
      const result = await service.createStep(req.body, parseAuthActor(req))
      res.status(201).json(result)
    }),

    update: wrap(async (req, res) => {
      const result = await service.updateStep(String(req.params.id), req.body, parseAuthActor(req))
      res.status(200).json(result)
    }),

    remove: wrap(async (req, res) => {
      await service.deleteStep(String(req.params.id), parseAuthActor(req))
      res.status(204).send()
    }),
  }
}
