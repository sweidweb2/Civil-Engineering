import { Router } from 'express'

import { validate } from '../../middleware/validate.js'
import type { ProjectsController } from './projects.controller.js'
import {
  createProjectBodySchema,
  projectIdParamsSchema,
  updateProjectBodySchema,
} from './projects.schema.js'

export function createProjectsRoutes(controller: ProjectsController): Router {
  const router = Router()

  router.get('/', controller.list)
  router.get(
    '/:id',
    validate({ params: projectIdParamsSchema }),
    controller.getById
  )
  router.post('/', validate({ body: createProjectBodySchema }), controller.create)
  router.patch(
    '/:id',
    validate({ params: projectIdParamsSchema, body: updateProjectBodySchema }),
    controller.update
  )
  router.post(
    '/:id/archive',
    validate({ params: projectIdParamsSchema }),
    controller.archive
  )

  return router
}
