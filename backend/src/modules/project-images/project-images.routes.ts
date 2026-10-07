import { Router } from 'express'

import { authenticate } from '../../middleware/auth.js'
import type { ProjectImagesController } from './project-images.controller.js'

export type ProjectImagesRouterDeps = {
  controller: ProjectImagesController
}

export function createProjectImagesRouter(deps: ProjectImagesRouterDeps): Router {
  const { controller } = deps
  const router = Router()

  router.get('/projects/:projectId/images', authenticate, controller.listProjectImages)
  router.get('/images/:imageId', authenticate, controller.getProjectImage)
  router.post(
    '/projects/:projectId/images',
    authenticate,
    controller.uploadMiddleware,
    controller.uploadProjectImage
  )
  router.patch('/images/:imageId', authenticate, controller.updateProjectImage)
  router.delete('/images/:imageId', authenticate, controller.deleteProjectImage)
  router.post(
    '/projects/:projectId/images/reorder',
    authenticate,
    controller.reorderProjectImages
  )

  return router
}
