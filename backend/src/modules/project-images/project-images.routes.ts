import { Router } from 'express'
import { z } from 'zod'

import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import { resourceIdSchema } from '../../schemas/index.js'
import type { ProjectImagesController } from './project-images.controller.js'
import {
  reorderProjectImagesBodySchema,
  updateProjectImageBodySchema,
  uploadProjectImageBodySchema,
} from './project-images.schema.js'

const projectIdParamsSchema = z.object({
  projectId: resourceIdSchema,
})

const imageIdParamsSchema = z.object({
  imageId: resourceIdSchema,
})

export type ProjectImagesRouterDeps = {
  controller: ProjectImagesController
}

export function createProjectImagesRouter(deps: ProjectImagesRouterDeps): Router {
  const { controller } = deps
  const router = Router()

  router.get(
    '/projects/:projectId/images',
    authenticate,
    validate({ params: projectIdParamsSchema }),
    controller.listProjectImages,
  )
  router.get(
    '/images/:imageId',
    authenticate,
    validate({ params: imageIdParamsSchema }),
    controller.getProjectImage,
  )
  router.post(
    '/projects/:projectId/images',
    authenticate,
    controller.uploadMiddleware,
    validate({ params: projectIdParamsSchema, body: uploadProjectImageBodySchema }),
    controller.uploadProjectImage,
  )
  router.patch(
    '/images/:imageId',
    authenticate,
    validate({ params: imageIdParamsSchema, body: updateProjectImageBodySchema }),
    controller.updateProjectImage,
  )
  router.delete(
    '/images/:imageId',
    authenticate,
    validate({ params: imageIdParamsSchema }),
    controller.deleteProjectImage,
  )
  router.post(
    '/projects/:projectId/images/reorder',
    authenticate,
    validate({ params: projectIdParamsSchema, body: reorderProjectImagesBodySchema }),
    controller.reorderProjectImages,
  )

  return router
}
