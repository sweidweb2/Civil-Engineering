import { z } from 'zod'

/** FormData sends booleans as "true"/"false" strings; JSON sends real booleans. */
const formBooleanSchema = z.preprocess((value) => {
  if (value === 'true' || value === true) return true
  if (value === 'false' || value === false) return false
  return value
}, z.boolean())

export const uploadListingImageBodySchema = z.object({
  displayOrder: z.coerce.number().int().min(0).optional(),
  isMain: formBooleanSchema.optional(),
})

export const updateListingImageBodySchema = z.object({
  displayOrder: z.coerce.number().int().min(0).optional(),
  isMain: formBooleanSchema.optional(),
})

export const reorderListingImagesBodySchema = z.object({
  imageIds: z.array(z.string()).min(1).max(15),
})

export type UploadListingImageBody = z.infer<typeof uploadListingImageBodySchema>
export type UpdateListingImageBody = z.infer<typeof updateListingImageBodySchema>
export type ReorderListingImagesBody = z.infer<typeof reorderListingImagesBodySchema>
