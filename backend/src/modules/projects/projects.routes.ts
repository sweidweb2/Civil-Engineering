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

export function createProjectsRoutes(controller: ProjectsController): Router {
  const router = Router()

  router.use(authenticate)

  router.get('/', validate({ query: listProjectsQuerySchema }), controller.list)
  router.get('/summary', controller.summary)
  router.get('/timeline', controller.timeline)
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
