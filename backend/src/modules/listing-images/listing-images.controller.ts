import type { RequestHandler } from 'express'

import { parseAuthActor } from '../../auth/auth-actor.js'
import { wrap } from '../../errors/async-handler.js'
import { createImageUpload, MAX_GALLERY_IMAGES } from '../files/index.js'
import type { ListingImagesService } from './listing-images.service.js'

const upload = createImageUpload()

export type ListingImagesController = {
  listListingImages: RequestHandler
  getListingImage: RequestHandler
  uploadListingImage: RequestHandler
  uploadListingImagesBatch: RequestHandler
  updateListingImage: RequestHandler
  deleteListingImage: RequestHandler
  reorderListingImages: RequestHandler
  uploadMiddleware: ReturnType<typeof upload.single>
  uploadBatchMiddleware: ReturnType<typeof upload.array>
}

export type ListingImagesControllerDeps = {
  service: ListingImagesService
}

export function createListingImagesController(
  deps: ListingImagesControllerDeps,
): ListingImagesController {
  const { service } = deps

  return {
    uploadMiddleware: upload.single('image'),
    uploadBatchMiddleware: upload.array('images', MAX_GALLERY_IMAGES),

    listListingImages: wrap(async (req, res) => {
      const actor = parseAuthActor(req)
      const images = await service.listListingImages(actor, String(req.params.listingId))
      res.json({ data: images })
    }),

    getListingImage: wrap(async (req, res) => {
      const actor = parseAuthActor(req)
      const image = await service.getListingImage(actor, String(req.params.imageId))
      res.json({ data: image })
    }),

    uploadListingImage: wrap(async (req, res) => {
      const actor = parseAuthActor(req)
      if (!req.file) {
        res.status(400).json({ error: 'No image file provided' })
        return
      }
      const image = await service.uploadListingImage(
        actor,
        String(req.params.listingId),
        req.file,
        req.body,
      )
      res.status(201).json({ data: image })
    }),

    uploadListingImagesBatch: wrap(async (req, res) => {
      const actor = parseAuthActor(req)
      const files = req.files
      if (!Array.isArray(files) || files.length === 0) {
        res.status(400).json({ error: 'No image files provided' })
        return
      }
      const images = await service.uploadListingImagesBatch(
        actor,
        String(req.params.listingId),
        files,
        req.body,
      )
      res.status(201).json({ data: images })
    }),

    updateListingImage: wrap(async (req, res) => {
      const actor = parseAuthActor(req)
      const image = await service.updateListingImage(actor, String(req.params.imageId), req.body)
      res.json({ data: image })
    }),

    deleteListingImage: wrap(async (req, res) => {
      const actor = parseAuthActor(req)
      await service.deleteListingImage(actor, String(req.params.imageId))
      res.status(204).send()
    }),

    reorderListingImages: wrap(async (req, res) => {
      const actor = parseAuthActor(req)
      const images = await service.reorderListingImages(
        actor,
        String(req.params.listingId),
        req.body,
      )
      res.json({ data: images })
    }),
  }
}
