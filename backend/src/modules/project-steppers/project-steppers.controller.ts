import type { RequestHandler } from 'express'

import { parseAuthActor } from '../../auth/auth-actor.js'
import { wrap } from '../../errors/async-handler.js'
import type { ProjectSteppersService } from './project-steppers.service.js'

export type ProjectSteppersController = {
  list: RequestHandler
  getById: RequestHandler
  saveValues: RequestHandler
  addInput: RequestHandler
  removeInput: RequestHandler
}

export function createProjectSteppersController(
  service: ProjectSteppersService,
): ProjectSteppersController {
  return {
    list: wrap(async (req, res) => {
      const data = await service.listSteppers(String(req.params.id), parseAuthActor(req))
      res.status(200).json({ data })
    }),

    getById: wrap(async (req, res) => {
      const data = await service.getStepper(
        String(req.params.id),
        String(req.params.stepperProjectId),
        parseAuthActor(req),
      )
      res.status(200).json({ data })
    }),

    saveValues: wrap(async (req, res) => {
      const data = await service.saveValues(
        String(req.params.id),
        String(req.params.stepperProjectId),
        req.body,
        parseAuthActor(req),
      )
      res.status(200).json({ data })
    }),

    addInput: wrap(async (req, res) => {
      const result = await service.addInput(
        String(req.params.id),
        String(req.params.stepperProjectId),
        req.body,
        parseAuthActor(req),
      )
      res.status(201).json(result)
    }),

    removeInput: wrap(async (req, res) => {
      await service.removeInput(
        String(req.params.id),
        String(req.params.stepperProjectId),
        String(req.params.inputId),
        parseAuthActor(req),
      )
      res.status(204).send()
    }),
  }
}
