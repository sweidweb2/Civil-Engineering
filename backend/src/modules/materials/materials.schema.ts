import { z } from 'zod'

export const materialIdParamsSchema = z.object({
  id: z.string().min(1),
})

export const createMaterialBodySchema = z.object({
  name: z.string().min(1).max(200),
  unitCode: z.string().min(1).max(32),
  sku: z.string().max(64).optional(),
})

export const updateMaterialBodySchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    unitCode: z.string().min(1).max(32).optional(),
    sku: z.string().max(64).optional(),
    active: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  })

export const stockMovementBodySchema = z.object({
  quantity: z.number().positive(),
  direction: z.enum(['in', 'out']),
  projectId: z.string().min(1).optional(),
  note: z.string().max(500).optional(),
})

export type CreateMaterialBody = z.infer<typeof createMaterialBodySchema>
export type UpdateMaterialBody = z.infer<typeof updateMaterialBodySchema>
export type StockMovementBody = z.infer<typeof stockMovementBodySchema>
