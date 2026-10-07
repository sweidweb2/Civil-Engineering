import { z } from 'zod'

export const uploadProjectImageBodySchema = z.object({
  displayOrder: z.number().int().min(0).optional(),
  isMain: z.boolean().optional(),
})

export const updateProjectImageBodySchema = z.object({
  displayOrder: z.number().int().min(0).optional(),
  isMain: z.boolean().optional(),
})

export const reorderProjectImagesBodySchema = z.object({
  imageIds: z.array(z.string()).min(1).max(15),
})

export type UploadProjectImageBody = z.infer<typeof uploadProjectImageBodySchema>
export type UpdateProjectImageBody = z.infer<typeof updateProjectImageBodySchema>
export type ReorderProjectImagesBody = z.infer<typeof reorderProjectImagesBodySchema>
