import { Router } from 'express'

import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import type { ProjectProductivityController } from './project-productivity.controller.js'
import {
  projectIdParamsSchema,
  upsertProductivityHoursBodySchema,
} from './project-productivity.schema.js'

export type ProjectProductivityRouterDeps = {
  controller: ProjectProductivityController
}

export function createProjectProductivityRouter(deps: ProjectProductivityRouterDeps): Router {
  const { controller } = deps
  const router = Router({ mergeParams: true })

  router.use(authenticate)

  router.get(
    '/:projectId/productivity-hours',
    validate({ params: projectIdParamsSchema }),
    controller.list,
  )

  router.put(
    '/:projectId/productivity-hours',
    validate({ params: projectIdParamsSchema, body: upsertProductivityHoursBodySchema }),
    controller.upsert,
  )

  return router
}
