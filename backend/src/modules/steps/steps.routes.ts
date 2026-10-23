import { Router } from 'express'

import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { validate } from '../../middleware/validate.js'
import type { StepsController } from './steps.controller.js'
import {
  createStepBodySchema,
  createStepInputBodySchema,
  listStepInputsQuerySchema,
  listStepsQuerySchema,
  stepIdParamsSchema,
  stepInputParamsSchema,
  updateStepBodySchema,
  updateStepInputBodySchema,
} from './steps.schema.js'
import { STEP_MANAGER_ROLES } from './steps.service.js'

export function createStepsRoutes(controller: StepsController): Router {
  const router = Router()

  router.use(authenticate)
  router.use(authorize(...STEP_MANAGER_ROLES))

  router.get('/', validate({ query: listStepsQuerySchema }), controller.list)
  router.post('/', validate({ body: createStepBodySchema }), controller.create)

  router.get(
    '/:id/inputs',
    validate({ params: stepIdParamsSchema, query: listStepInputsQuerySchema }),
    controller.listInputs,
  )
  router.post(
    '/:id/inputs',
    validate({ params: stepIdParamsSchema, body: createStepInputBodySchema }),
    controller.createInput,
  )
  router.patch(
    '/:id/inputs/:inputId',
    validate({ params: stepInputParamsSchema, body: updateStepInputBodySchema }),
    controller.updateInput,
  )
  router.delete(
    '/:id/inputs/:inputId',
    validate({ params: stepInputParamsSchema }),
    controller.removeInput,
  )

  router.get('/:id', validate({ params: stepIdParamsSchema }), controller.getById)
  router.patch(
    '/:id',
    validate({ params: stepIdParamsSchema, body: updateStepBodySchema }),
    controller.update,
  )
  router.delete('/:id', validate({ params: stepIdParamsSchema }), controller.remove)

  return router
}
