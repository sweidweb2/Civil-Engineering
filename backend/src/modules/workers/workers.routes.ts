import { Router } from 'express'

import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import type { WorkersController } from './workers.controller.js'
import {
  assignWorkerBodySchema,
  createWorkerBodySchema,
  listWorkersQuerySchema,
  updateWorkerBodySchema,
  workerIdParamsSchema,
} from './workers.schema.js'

export function createWorkersRoutes(controller: WorkersController): Router {
  const router = Router()

  router.use(authenticate)

  router.get('/', validate({ query: listWorkersQuerySchema }), controller.list)
  router.get('/:id', validate({ params: workerIdParamsSchema }), controller.getById)
  router.post('/', validate({ body: createWorkerBodySchema }), controller.create)
  router.patch(
    '/:id',
    validate({ params: workerIdParamsSchema, body: updateWorkerBodySchema }),
    controller.update,
  )
  router.post(
    '/:id/assignments',
    validate({ params: workerIdParamsSchema, body: assignWorkerBodySchema }),
    controller.assign,
  )

  return router
}
