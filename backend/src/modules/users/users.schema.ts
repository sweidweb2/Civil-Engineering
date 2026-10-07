import { z } from 'zod'

import { paginationQuerySchema } from '../_shared/pagination.schema.js'

export const userIdParamsSchema = z.object({
  id: z.string().trim().min(1, 'User ID is required'),
})

export const listUsersQuerySchema = paginationQuerySchema

export const createUserBodySchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .min(1, 'Email is required')
    .max(255, 'Email must be at most 255 characters')
    .email('Invalid email format'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be at most 100 characters'),
  role: z.enum(['SUPER', 'ADMIN', 'PROVIDER', 'WORKER', 'MANAGER', 'CLIENT']).default('CLIENT'),
  isVerified: z.boolean().optional(),
  firstName: z.string().trim().min(1).max(100, 'First name must be at most 100 characters').optional().or(z.literal('')),
  lastName: z.string().trim().min(1).max(100, 'Last name must be at most 100 characters').optional().or(z.literal('')),
  displayName: z.string().trim().min(1).max(120, 'Display name must be at most 120 characters').optional().or(z.literal('')),
  phone: z.string().trim().min(1).max(20, 'Phone must be at most 20 characters').optional().or(z.literal('')),
})

export const updateUserBodySchema = z
  .object({
    role: z.enum(['SUPER', 'ADMIN', 'PROVIDER', 'WORKER', 'MANAGER', 'CLIENT']).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    isVerified: z.boolean().optional(),
    firstName: z.string().trim().min(1).max(100, 'First name must be at most 100 characters').optional().or(z.literal('')),
    lastName: z.string().trim().min(1).max(100, 'Last name must be at most 100 characters').optional().or(z.literal('')),
    displayName: z.string().trim().min(1).max(120, 'Display name must be at most 120 characters').optional().or(z.literal('')),
    phone: z.string().trim().min(1).max(20, 'Phone must be at most 20 characters').optional().or(z.literal('')),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  })

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>
export type CreateUserBody = z.infer<typeof createUserBodySchema>
export type UpdateUserBody = z.infer<typeof updateUserBodySchema>
