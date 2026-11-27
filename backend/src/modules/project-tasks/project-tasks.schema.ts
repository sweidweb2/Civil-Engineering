import { z } from 'zod'

import { resourceIdSchema } from '../../schemas/index.js'
import { paginationQuerySchema } from '../_shared/pagination.schema.js'

export const projectIdParamsSchema = z.object({
  projectId: resourceIdSchema,
})

export const projectTaskIdParamsSchema = z.object({
  projectId: resourceIdSchema,
  taskId: resourceIdSchema,
})

export const listProjectTasksQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
})

export const createProjectTaskBodySchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional().nullable(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  dueDate: z.string().date().optional().nullable(),
  assigneeProjectWorkerId: resourceIdSchema.optional().nullable(),
})

export const updateProjectTaskBodySchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(5000).optional().nullable(),
    status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
    dueDate: z.string().date().optional().nullable(),
    assigneeProjectWorkerId: resourceIdSchema.optional().nullable(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: 'At least one field is required' })

export const workerUpdateTaskBodySchema = z.object({
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']),
})

export type ListProjectTasksQuery = z.infer<typeof listProjectTasksQuerySchema>
export type CreateProjectTaskBody = z.infer<typeof createProjectTaskBodySchema>
export type UpdateProjectTaskBody = z.infer<typeof updateProjectTaskBodySchema>
export type WorkerUpdateTaskBody = z.infer<typeof workerUpdateTaskBodySchema>
