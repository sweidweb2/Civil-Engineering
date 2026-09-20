import { z } from 'zod'

import { paginationQuerySchema } from '../_shared/pagination.schema.js'

export const workerIdParamsSchema = z.object({
  id: z.string().trim().min(1),
})

export const listWorkersQuerySchema = paginationQuerySchema

export const createWorkerBodySchema = z.object({
  name: z.string().min(1).max(120),
  phone: z.string().min(5).max(40).optional(),
  userId: z.string().min(1).optional(),
})

export const updateWorkerBodySchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    phone: z.string().min(5).max(40).optional(),
    active: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  })

export const assignWorkerBodySchema = z.object({
  projectId: z.string().min(1),
  role: z.string().min(1).max(80),
  startedAt: z.string().datetime().optional(),
})

export type ListWorkersQuery = z.infer<typeof listWorkersQuerySchema>
export type CreateWorkerBody = z.infer<typeof createWorkerBodySchema>
export type UpdateWorkerBody = z.infer<typeof updateWorkerBodySchema>
export type AssignWorkerBody = z.infer<typeof assignWorkerBodySchema>
