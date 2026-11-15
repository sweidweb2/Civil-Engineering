import { z } from 'zod'

import { passwordSchema } from './password.schema.js'

export const roleSchema = z.enum(['SUPER', 'ADMIN', 'PROVIDER', 'WORKER', 'MANAGER', 'CLIENT'])

export type RoleName = z.infer<typeof roleSchema>

/** Roles allowed on public self-registration. */
export const registerRoleSchema = z.enum(['CLIENT', 'WORKER', 'MANAGER'])

export type RegisterRole = z.infer<typeof registerRoleSchema>

const deviceIdSchema = z
  .string()
  .trim()
  .min(8, 'Device id is required')
  .max(128, 'Device id is too long')

export const registerBodySchema = z.object({
  email: z
    .string()
    .email()
    .transform((value) => value.trim().toLowerCase()),
  password: passwordSchema,
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
  role: registerRoleSchema.default('CLIENT'),
  /** Stable client-generated device fingerprint (MAC is not available in browsers). */
  deviceId: deviceIdSchema,
})

export const loginBodySchema = z.object({
  email: z
    .string()
    .email()
    .transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1).max(128),
})

/** Body token optional when httpOnly refresh cookie is present. */
export const refreshBodySchema = z.object({
  refreshToken: z.string().min(1).optional(),
})

export const changePasswordBodySchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required').max(128),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm password is required').max(128),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    message: 'New password must be different from the current password',
    path: ['newPassword'],
  })

export type RegisterBody = z.infer<typeof registerBodySchema>
export type LoginBody = z.infer<typeof loginBodySchema>
export type RefreshBody = { refreshToken: string }
export type ChangePasswordBody = z.infer<typeof changePasswordBodySchema>
