import { Router } from 'express'

import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import type { FilesController } from './files.controller.js'
import {
  fileIdParamsSchema,
  presignFileBodySchema,
  uploadFileFieldsSchema,
} from './files.schema.js'

export function createFilesRoutes(controller: FilesController): Router {
  const router = Router()

  router.use(authenticate)

  router.post('/presign', validate({ body: presignFileBodySchema }), controller.presign)
  /** API → R2 (same pattern as avatar / project gallery — avoids browser→R2 CORS). */
  router.post(
    '/upload',
    controller.uploadMiddleware,
    validate({ body: uploadFileFieldsSchema }),
    controller.upload,
  )
  router.post('/:id/complete', validate({ params: fileIdParamsSchema }), controller.complete)
  router.get('/:id/download-url', validate({ params: fileIdParamsSchema }), controller.downloadUrl)
  router.delete('/:id', validate({ params: fileIdParamsSchema }), controller.softDelete)

  return router
}
