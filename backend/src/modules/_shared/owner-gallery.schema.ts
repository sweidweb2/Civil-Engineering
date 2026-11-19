import { z } from 'zod'

import { formBooleanSchema } from './form-boolean.schema.js'

/** Shared body schemas for owner-scoped gallery image endpoints. */
export const uploadGalleryImageBodySchema = z.object({
  displayOrder: z.coerce.number().int().min(0).optional(),
  isMain: formBooleanSchema.optional(),
})

export const updateGalleryImageBodySchema = z.object({
  displayOrder: z.coerce.number().int().min(0).optional(),
  isMain: formBooleanSchema.optional(),
})

export const reorderGalleryImagesBodySchema = z.object({
  imageIds: z.array(z.string()).min(1).max(15),
})

export type UploadGalleryImageBody = z.infer<typeof uploadGalleryImageBodySchema>
export type UpdateGalleryImageBody = z.infer<typeof updateGalleryImageBodySchema>
export type ReorderGalleryImagesBody = z.infer<typeof reorderGalleryImagesBodySchema>
