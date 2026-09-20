import { z } from 'zod'

export const userIdParamsSchema = z.object({
  id: z.string().min(1),
})

export const createUserBodySchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120),
  roles: z.array(z.string().min(1)).default([]),
})

export const updateUserBodySchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    roles: z.array(z.string().min(1)).optional(),
    status: z.enum(['active', 'inactive']).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  })

export type CreateUserBody = z.infer<typeof createUserBodySchema>
export type UpdateUserBody = z.infer<typeof updateUserBodySchema>
