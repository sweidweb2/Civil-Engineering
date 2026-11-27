import { z } from 'zod'

import { resourceIdSchema } from '../../schemas/index.js'
import { paginationQuerySchema } from '../_shared/pagination.schema.js'

export const projectIdParamsSchema = z.object({
  projectId: resourceIdSchema,
})

export const projectWorkerIdParamsSchema = z.object({
  projectId: resourceIdSchema,
  id: resourceIdSchema,
})

export const workerProjectParamsSchema = z.object({
  projectId: resourceIdSchema,
})

export const inviteProjectWorkerBodySchema = z.object({
  workerUserId: resourceIdSchema,
})

export const listProjectWorkersQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED']).optional(),
})

export const listWorkerProjectsQuerySchema = paginationQuerySchema

export type InviteProjectWorkerBody = z.infer<typeof inviteProjectWorkerBodySchema>
export type ListProjectWorkersQuery = z.infer<typeof listProjectWorkersQuerySchema>
export type ListWorkerProjectsQuery = z.infer<typeof listWorkerProjectsQuerySchema>
