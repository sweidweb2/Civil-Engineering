import type { RequestHandler } from 'express'

import { parseAuthActor } from '../../auth/auth-actor.js'
import { wrap } from '../../errors/async-handler.js'
import { createImageUpload } from '../files/index.js'
import type { ProjectImagesService } from './project-images.service.js'

const upload = createImageUpload()

export type ProjectImagesController = {
  listProjectImages: RequestHandler
  getProjectImage: RequestHandler
  uploadProjectImage: RequestHandler
  updateProjectImage: RequestHandler
  deleteProjectImage: RequestHandler
  reorderProjectImages: RequestHandler
  uploadMiddleware: ReturnType<typeof upload.single>
}

export type ProjectImagesControllerDeps = {
  service: ProjectImagesService
}

export function createProjectImagesController(
  deps: ProjectImagesControllerDeps,
): ProjectImagesController {
  const { service } = deps

  return {
    uploadMiddleware: upload.single('image'),

    listProjectImages: wrap(async (req, res) => {
      const actor = parseAuthActor(req)
      const images = await service.listProjectImages(actor, String(req.params.projectId))
      res.json({ data: images })
    }),

    getProjectImage: wrap(async (req, res) => {
      const actor = parseAuthActor(req)
      const image = await service.getProjectImage(actor, String(req.params.imageId))
      res.json({ data: image })
    }),

    uploadProjectImage: wrap(async (req, res) => {
      const actor = parseAuthActor(req)
      if (!req.file) {
        res.status(400).json({ error: 'No image file provided' })
        return
      }
      const image = await service.uploadProjectImage(
        actor,
        String(req.params.projectId),
        req.file,
        req.body,
      )
      res.status(201).json({ data: image })
    }),

    updateProjectImage: wrap(async (req, res) => {
      const actor = parseAuthActor(req)
      const image = await service.updateProjectImage(actor, String(req.params.imageId), req.body)
      res.json({ data: image })
    }),

    deleteProjectImage: wrap(async (req, res) => {
      const actor = parseAuthActor(req)
      await service.deleteProjectImage(actor, String(req.params.imageId))
      res.status(204).send()
    }),

    reorderProjectImages: wrap(async (req, res) => {
      const actor = parseAuthActor(req)
      const images = await service.reorderProjectImages(
        actor,
        String(req.params.projectId),
        req.body,
      )
      res.json({ data: images })
    }),
  }
}
