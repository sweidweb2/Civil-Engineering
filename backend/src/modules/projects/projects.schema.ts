import { z } from 'zod'

export const projectIdParamsSchema = z.object({
  id: z.string().min(1),
})

export const createProjectBodySchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  status: z
    .enum(['draft', 'active', 'on_hold', 'completed', 'archived'])
    .default('draft'),
})

export const updateProjectBodySchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
    status: z
      .enum(['draft', 'active', 'on_hold', 'completed', 'archived'])
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  })

export type CreateProjectBody = z.infer<typeof createProjectBodySchema>
export type UpdateProjectBody = z.infer<typeof updateProjectBodySchema>
