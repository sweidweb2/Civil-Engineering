import { z } from 'zod'

import { paginationQuerySchema } from '../_shared/pagination.schema.js'

export const userIdParamsSchema = z.object({
  id: z.string().trim().min(1),
})

export const listUsersQuerySchema = paginationQuerySchema

export const createUserBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  role: z.enum(['SUPER', 'ADMIN', 'PROVIDER', 'WORKER', 'MANAGER', 'CLIENT']).default('CLIENT'),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  displayName: z.string().min(1).max(120).optional(),
  phone: z.string().min(1).max(20).optional(),
})

export const updateUserBodySchema = z
  .object({
    role: z.enum(['SUPER', 'ADMIN', 'PROVIDER', 'WORKER', 'MANAGER', 'CLIENT']).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    displayName: z.string().min(1).max(120).optional(),
    phone: z.string().min(1).max(20).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  })

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>
export type CreateUserBody = z.infer<typeof createUserBodySchema>
export type UpdateUserBody = z.infer<typeof updateUserBodySchema>
