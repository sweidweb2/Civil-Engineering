import { Router } from 'express'
import { z } from 'zod'

import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import { resourceIdSchema } from '../../schemas/index.js'
import type { ListingImagesController } from './listing-images.controller.js'
import {
  reorderListingImagesBodySchema,
  updateListingImageBodySchema,
  uploadListingImageBodySchema,
  uploadListingImagesBatchBodySchema,
} from './listing-images.schema.js'

const listingIdParamsSchema = z.object({
  listingId: resourceIdSchema,
})

const imageIdParamsSchema = z.object({
  imageId: resourceIdSchema,
})

export type ListingImagesRouterDeps = {
  controller: ListingImagesController
}

export function createListingImagesRouter(deps: ListingImagesRouterDeps): Router {
  const { controller } = deps
  const router = Router()

  router.get(
    '/listings/:listingId/images',
    authenticate,
    validate({ params: listingIdParamsSchema }),
    controller.listListingImages,
  )
  router.get(
    '/images/:imageId',
    authenticate,
    validate({ params: imageIdParamsSchema }),
    controller.getListingImage,
  )
  router.post(
    '/listings/:listingId/images',
    authenticate,
    controller.uploadMiddleware,
    validate({ params: listingIdParamsSchema, body: uploadListingImageBodySchema }),
    controller.uploadListingImage,
  )
  router.post(
    '/listings/:listingId/images/batch',
    authenticate,
    controller.uploadBatchMiddleware,
    validate({ params: listingIdParamsSchema, body: uploadListingImagesBatchBodySchema }),
    controller.uploadListingImagesBatch,
  )
  router.patch(
    '/images/:imageId',
    authenticate,
    validate({ params: imageIdParamsSchema, body: updateListingImageBodySchema }),
    controller.updateListingImage,
  )
  router.delete(
    '/images/:imageId',
    authenticate,
    validate({ params: imageIdParamsSchema }),
    controller.deleteListingImage,
  )
  router.post(
    '/listings/:listingId/images/reorder',
    authenticate,
    validate({ params: listingIdParamsSchema, body: reorderListingImagesBodySchema }),
    controller.reorderListingImages,
  )

  return router
}
