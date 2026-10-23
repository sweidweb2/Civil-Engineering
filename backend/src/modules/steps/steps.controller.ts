import type { RequestHandler } from 'express'

import { parseAuthActor } from '../../auth/auth-actor.js'
import { wrap } from '../../errors/async-handler.js'
import type { ListStepInputsQuery, ListStepsQuery } from './steps.schema.js'
import type { StepsService } from './steps.service.js'

export type StepsController = {
  list: RequestHandler
  getById: RequestHandler
  create: RequestHandler
  update: RequestHandler
  remove: RequestHandler
  listInputs: RequestHandler
  createInput: RequestHandler
  updateInput: RequestHandler
  removeInput: RequestHandler
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

    listInputs: wrap(async (req, res) => {
      const result = await service.listStepInputs(
        String(req.params.id),
        req.query as unknown as ListStepInputsQuery,
        parseAuthActor(req),
      )
      res.status(200).json(result)
    }),

    createInput: wrap(async (req, res) => {
      const result = await service.createStepInput(
        String(req.params.id),
        req.body,
        parseAuthActor(req),
      )
      res.status(201).json(result)
    }),

    updateInput: wrap(async (req, res) => {
      const result = await service.updateStepInput(
        String(req.params.id),
        String(req.params.inputId),
        req.body,
        parseAuthActor(req),
      )
      res.status(200).json(result)
    }),

    removeInput: wrap(async (req, res) => {
      await service.deleteStepInput(
        String(req.params.id),
        String(req.params.inputId),
        parseAuthActor(req),
      )
      res.status(204).send()
    }),
  }
}
