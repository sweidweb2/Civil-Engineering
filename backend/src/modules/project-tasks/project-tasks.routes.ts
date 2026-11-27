import { Router } from 'express'

import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { validate } from '../../middleware/validate.js'
import type { ProjectTasksController } from './project-tasks.controller.js'
import {
  createProjectTaskBodySchema,
  listProjectTasksQuerySchema,
  projectIdParamsSchema,
  projectTaskIdParamsSchema,
  updateProjectTaskBodySchema,
  workerUpdateTaskBodySchema,
} from './project-tasks.schema.js'

export type ProjectTasksRouterDeps = {
  controller: ProjectTasksController
}

/** Nested under `/projects`. */
export function createProjectTasksRouter(deps: ProjectTasksRouterDeps): Router {
  const { controller } = deps
  const router = Router({ mergeParams: true })

  router.use(authenticate)

  router.get(
    '/:projectId/tasks',
    validate({ params: projectIdParamsSchema, query: listProjectTasksQuerySchema }),
    controller.listByProject,
  )
  router.post(
    '/:projectId/tasks',
    validate({ params: projectIdParamsSchema, body: createProjectTaskBodySchema }),
    controller.create,
  )
  router.patch(
    '/:projectId/tasks/:taskId',
    validate({ params: projectTaskIdParamsSchema, body: updateProjectTaskBodySchema }),
    controller.update,
  )
  router.delete(
    '/:projectId/tasks/:taskId',
    validate({ params: projectTaskIdParamsSchema }),
    controller.remove,
  )

  return router
}

/** Nested under `/workers` — worker own tasks. */
export function createWorkerProjectTasksRouter(deps: ProjectTasksRouterDeps): Router {
  const { controller } = deps
  const router = Router({ mergeParams: true })

  router.use(authenticate, authorize('WORKER'))

  router.get(
    '/me/projects/:projectId/tasks',
    validate({ params: projectIdParamsSchema, query: listProjectTasksQuerySchema }),
    controller.listMine,
  )
  router.patch(
    '/me/projects/:projectId/tasks/:taskId',
    validate({ params: projectTaskIdParamsSchema, body: workerUpdateTaskBodySchema }),
    controller.updateMineStatus,
  )

  return router
}
