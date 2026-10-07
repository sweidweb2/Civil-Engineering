import type { Request, Response } from 'express'
import multer from 'multer'

import { parseAuthActor } from '../../auth/auth-actor.js'
import { wrap } from '../../errors/async-handler.js'
import { validateBody, validateParams } from '../../middleware/validate.js'
import { uuidSchema } from '../../schemas/index.js'
import {
  reorderProjectImagesBodySchema,
  updateProjectImageBodySchema,
  uploadProjectImageBodySchema,
} from './project-images.schema.js'
import type { ProjectImagesService } from './project-images.service.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
})

export type ProjectImagesController = {
  listProjectImages: (req: Request, res: Response) => Promise<void>
  getProjectImage: (req: Request, res: Response) => Promise<void>
  uploadProjectImage: (req: Request, res: Response) => Promise<void>
  updateProjectImage: (req: Request, res: Response) => Promise<void>
  deleteProjectImage: (req: Request, res: Response) => Promise<void>
  reorderProjectImages: (req: Request, res: Response) => Promise<void>
  uploadMiddleware: ReturnType<typeof upload.single>
}

export type ProjectImagesControllerDeps = {
  service: ProjectImagesService
}

export function createProjectImagesController(
  deps: ProjectImagesControllerDeps
): ProjectImagesController {
  const { service } = deps

  return {
    uploadMiddleware: upload.single('image'),

    listProjectImages: wrap(async (req, res) => {
      await validateParams(req, { projectId: uuidSchema })
      const actor = parseAuthActor(req)
      const { projectId } = req.params
      const images = await service.listProjectImages(actor, projectId)
      res.json({ data: images })
    }),

    getProjectImage: wrap(async (req, res) => {
      await validateParams(req, { imageId: uuidSchema })
      const actor = parseAuthActor(req)
      const { imageId } = req.params
      const image = await service.getProjectImage(actor, imageId)
      res.json({ data: image })
    }),

    uploadProjectImage: wrap(async (req, res) => {
      await validateParams(req, { projectId: uuidSchema })
      await validateBody(req, uploadProjectImageBodySchema)
      const actor = parseAuthActor(req)
      const { projectId } = req.params

      if (!req.file) {
        res.status(400).json({ error: 'No image file provided' })
        return
      }

      const image = await service.uploadProjectImage(actor, projectId, req.file, req.body)
      res.status(201).json({ data: image })
    }),

    updateProjectImage: wrap(async (req, res) => {
      await validateParams(req, { imageId: uuidSchema })
      await validateBody(req, updateProjectImageBodySchema)
      const actor = parseAuthActor(req)
      const { imageId } = req.params
      const image = await service.updateProjectImage(actor, imageId, req.body)
      res.json({ data: image })
    }),

    deleteProjectImage: wrap(async (req, res) => {
      await validateParams(req, { imageId: uuidSchema })
      const actor = parseAuthActor(req)
      const { imageId } = req.params
      await service.deleteProjectImage(actor, imageId)
      res.status(204).send()
    }),

    reorderProjectImages: wrap(async (req, res) => {
      await validateParams(req, { projectId: uuidSchema })
      await validateBody(req, reorderProjectImagesBodySchema)
      const actor = parseAuthActor(req)
      const { projectId } = req.params
      const images = await service.reorderProjectImages(actor, projectId, req.body)
      res.json({ data: images })
    }),
  }
}
