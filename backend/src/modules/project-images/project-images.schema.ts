import { z } from 'zod'

/** FormData sends booleans as "true"/"false" strings; JSON sends real booleans. */
const formBooleanSchema = z.preprocess((value) => {
  if (value === 'true' || value === true) return true
  if (value === 'false' || value === false) return false
  return value
}, z.boolean())

export const uploadProjectImageBodySchema = z.object({
  displayOrder: z.coerce.number().int().min(0).optional(),
  isMain: formBooleanSchema.optional(),
})

export const updateProjectImageBodySchema = z.object({
  displayOrder: z.coerce.number().int().min(0).optional(),
  isMain: formBooleanSchema.optional(),
})

export const reorderProjectImagesBodySchema = z.object({
  imageIds: z.array(z.string()).min(1).max(15),
})

export type UploadProjectImageBody = z.infer<typeof uploadProjectImageBodySchema>
export type UpdateProjectImageBody = z.infer<typeof updateProjectImageBodySchema>
export type ReorderProjectImagesBody = z.infer<typeof reorderProjectImagesBodySchema>
