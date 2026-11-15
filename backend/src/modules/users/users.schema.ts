import { z } from 'zod'

import { countsQuerySchema } from '../_shared/counts.schema.js'
import { paginationQuerySchema } from '../_shared/pagination.schema.js'
import { passwordSchema } from '../auth/password.schema.js'

const optionalSearchQuery = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().max(120).optional(),
)

export const userIdParamsSchema = z.object({
  id: z.string().trim().min(1, 'User ID is required'),
})

/** After R2 upload + files complete — link READY image file as profile photo. */
export const setAvatarBodySchema = z.object({
  fileId: z.string().trim().min(1).max(64),
})

export const listUsersQuerySchema = paginationQuerySchema.extend({
  q: optionalSearchQuery,
  counts: countsQuerySchema,
})

export const listLookupQuerySchema = paginationQuerySchema.extend({
  q: optionalSearchQuery,
})

export const approvalStatusSchema = z.enum(['pending', 'approved'])

export const approvalRoleSchema = z.enum(['MANAGER', 'PROVIDER', 'WORKER'])

export const verificationStatusSchema = z.enum(['UNVERIFIED', 'REQUESTED', 'VERIFIED'])

export const listApprovalsQuerySchema = paginationQuerySchema.extend({
  approval: approvalStatusSchema.default('pending'),
  q: optionalSearchQuery,
  counts: countsQuerySchema,
})

export const createUserBodySchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .max(255, 'Email must be at most 255 characters')
    .email('Invalid email format'),
  password: passwordSchema,
  role: z.enum(['SUPER', 'ADMIN', 'PROVIDER', 'WORKER', 'MANAGER', 'CLIENT']).default('CLIENT'),
  isVerified: z.boolean().optional(),
  firstName: z
    .string()
    .trim()
    .min(1)
    .max(100, 'First name must be at most 100 characters')
    .optional()
    .or(z.literal('')),
  lastName: z
    .string()
    .trim()
    .min(1)
    .max(100, 'Last name must be at most 100 characters')
    .optional()
    .or(z.literal('')),
  displayName: z
    .string()
    .trim()
    .min(1)
    .max(120, 'Display name must be at most 120 characters')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .trim()
    .min(1)
    .max(20, 'Phone must be at most 20 characters')
    .optional()
    .or(z.literal('')),
})

export const updateUserBodySchema = z
  .object({
    role: z.enum(['SUPER', 'ADMIN', 'PROVIDER', 'WORKER', 'MANAGER', 'CLIENT']).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING']).optional(),
    isVerified: z.boolean().optional(),
    firstName: z
      .string()
      .trim()
      .min(1)
      .max(100, 'First name must be at most 100 characters')
      .optional()
      .or(z.literal('')),
    lastName: z
      .string()
      .trim()
      .min(1)
      .max(100, 'Last name must be at most 100 characters')
      .optional()
      .or(z.literal('')),
    displayName: z
      .string()
      .trim()
      .min(1)
      .max(120, 'Display name must be at most 120 characters')
      .optional()
      .or(z.literal('')),
    phone: z
      .string()
      .trim()
      .min(1)
      .max(20, 'Phone must be at most 20 characters')
      .optional()
      .or(z.literal('')),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  })

const profileFields = {
  firstName: z
    .string()
    .trim()
    .min(1)
    .max(100, 'First name must be at most 100 characters')
    .optional()
    .or(z.literal('')),
  lastName: z
    .string()
    .trim()
    .min(1)
    .max(100, 'Last name must be at most 100 characters')
    .optional()
    .or(z.literal('')),
  displayName: z
    .string()
    .trim()
    .min(1)
    .max(120, 'Display name must be at most 120 characters')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .trim()
    .min(1)
    .max(20, 'Phone must be at most 20 characters')
    .optional()
    .or(z.literal('')),
}

export const listVerificationsQuerySchema = paginationQuerySchema.extend({
  q: optionalSearchQuery,
  status: verificationStatusSchema.optional(),
})

export const setVerificationBodySchema = z.object({
  verificationStatus: verificationStatusSchema,
})

export const createVerificationBodySchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .max(255, 'Email must be at most 255 characters')
    .email('Invalid email format')
    .transform((value) => value.toLowerCase()),
  password: passwordSchema,
  ...profileFields,
})

export const createApprovalBodySchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .max(255, 'Email must be at most 255 characters')
    .email('Invalid email format')
    .transform((value) => value.toLowerCase()),
  password: passwordSchema,
  role: approvalRoleSchema,
  ...profileFields,
})

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>
export type ListLookupQuery = z.infer<typeof listLookupQuerySchema>
export type ListApprovalsQuery = z.infer<typeof listApprovalsQuerySchema>
export type CreateUserBody = z.infer<typeof createUserBodySchema>
export type CreateApprovalBody = z.infer<typeof createApprovalBodySchema>
export type ListVerificationsQuery = z.infer<typeof listVerificationsQuerySchema>
export type CreateVerificationBody = z.infer<typeof createVerificationBodySchema>
export type SetVerificationBody = z.infer<typeof setVerificationBodySchema>
export type UpdateUserBody = z.infer<typeof updateUserBodySchema>
export type SetAvatarBody = z.infer<typeof setAvatarBodySchema>
