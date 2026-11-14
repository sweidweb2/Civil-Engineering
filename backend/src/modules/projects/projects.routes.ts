import { Router } from 'express'

import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import type { ProjectsController } from './projects.controller.js'
import {
  createProjectBodySchema,
  listProjectsQuerySchema,
  projectIdParamsSchema,
  updateProjectBodySchema,
} from './projects.schema.js'
import type { ProjectSteppersController } from './projects.steppers.controller.js'
import {
  createProjectStepInputBodySchema,
  projectStepInputIdParamsSchema,
  projectStepperIdParamsSchema,
  projectStepperParamsSchema,
  upsertStepperValuesBodySchema,
} from './projects.steppers.schema.js'

export function createProjectsRoutes(
  controller: ProjectsController,
  steppersController?: ProjectSteppersController,
): Router {
  const router = Router()

  router.use(authenticate)

  router.get('/', validate({ query: listProjectsQuerySchema }), controller.list)
  router.get('/summary', controller.summary)
  router.get('/timeline', controller.timeline)

  if (steppersController) {
    router.get(
      '/:id/steppers',
      validate({ params: projectStepperParamsSchema }),
      steppersController.list,
    )
    router.get(
      '/:id/steppers/:projectStepId',
      validate({ params: projectStepperIdParamsSchema }),
      steppersController.getById,
    )
    router.put(
      '/:id/steppers/:projectStepId/values',
      validate({
        params: projectStepperIdParamsSchema,
        body: upsertStepperValuesBodySchema,
      }),
      steppersController.saveValues,
    )
    router.post(
      '/:id/steppers/:projectStepId/inputs',
      validate({
        params: projectStepperIdParamsSchema,
        body: createProjectStepInputBodySchema,
      }),
      steppersController.addInput,
    )
    router.delete(
      '/:id/steppers/:projectStepId/inputs/:inputId',
      validate({ params: projectStepInputIdParamsSchema }),
      steppersController.removeInput,
    )
  }

  router.get('/:id', validate({ params: projectIdParamsSchema }), controller.getById)
  router.post('/', validate({ body: createProjectBodySchema }), controller.create)
  router.patch(
    '/:id',
    validate({ params: projectIdParamsSchema, body: updateProjectBodySchema }),
    controller.update,
  )
  router.post('/:id/archive', validate({ params: projectIdParamsSchema }), controller.archive)

  return router
}
