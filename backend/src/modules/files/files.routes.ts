import { Router } from 'express'

import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import type { FilesController } from './files.controller.js'
import { fileIdParamsSchema, presignFileBodySchema } from './files.schema.js'

export function createFilesRoutes(controller: FilesController): Router {
  const router = Router()

  router.use(authenticate)

  router.post('/presign', validate({ body: presignFileBodySchema }), controller.presign)
  router.post(
    '/:id/complete',
    validate({ params: fileIdParamsSchema }),
    controller.complete,
  )
  router.get(
    '/:id/download-url',
    validate({ params: fileIdParamsSchema }),
    controller.downloadUrl,
  )
  router.delete('/:id', validate({ params: fileIdParamsSchema }), controller.softDelete)

  return router
}
