import { Router } from 'express'

import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { validate } from '../../middleware/validate.js'
import type { ProjectWorkersController } from './project-workers.controller.js'
import {
  inviteProjectWorkerBodySchema,
  listProjectWorkersQuerySchema,
  listWorkerProjectsQuerySchema,
  projectIdParamsSchema,
  projectWorkerIdParamsSchema,
  workerProjectParamsSchema,
} from './project-workers.schema.js'

export type ProjectWorkersRouterDeps = {
  controller: ProjectWorkersController
}

/** Nested under `/projects` (mergeParams). */
export function createProjectWorkersRouter(deps: ProjectWorkersRouterDeps): Router {
  const { controller } = deps
  const router = Router({ mergeParams: true })

  router.use(authenticate)

  router.get(
    '/:projectId/workers',
    validate({ params: projectIdParamsSchema, query: listProjectWorkersQuerySchema }),
    controller.listByProject,
  )
  router.post(
    '/:projectId/workers',
    validate({ params: projectIdParamsSchema, body: inviteProjectWorkerBodySchema }),
    controller.invite,
  )
  router.delete(
    '/:projectId/workers/:id',
    validate({ params: projectWorkerIdParamsSchema }),
    controller.remove,
  )

  return router
}

/** Nested under `/workers` — worker self project invites. */
export function createWorkerProjectsRouter(deps: ProjectWorkersRouterDeps): Router {
  const { controller } = deps
  const router = Router({ mergeParams: true })

  router.use(authenticate, authorize('WORKER'))

  router.get(
    '/me/projects',
    validate({ query: listWorkerProjectsQuerySchema }),
    controller.listMine,
  )
  router.get(
    '/me/projects/:projectId',
    validate({ params: workerProjectParamsSchema }),
    controller.getMine,
  )
  router.post(
    '/me/projects/:projectId/accept',
    validate({ params: workerProjectParamsSchema }),
    controller.accept,
  )
  router.post(
    '/me/projects/:projectId/reject',
    validate({ params: workerProjectParamsSchema }),
    controller.reject,
  )

  return router
}
