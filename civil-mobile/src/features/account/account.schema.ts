import { z } from 'zod'

import { passwordSchema } from '@/features/auth/password.schema'

/** Shared profile fields for the signed-in account (client / provider / worker settings). */
export const accountProfileSchema = z.object({
  firstName: z.string().trim().max(100, 'Max 100 characters'),
  lastName: z.string().trim().max(100, 'Max 100 characters'),
  displayName: z.string().trim().max(120, 'Max 120 characters'),
  phone: z.string().trim().max(20, 'Max 20 characters'),
})

export type AccountProfileValues = z.infer<typeof accountProfileSchema>

export const accountPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required').max(128),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm your new password').max(128),
  })
  .superRefine((value, ctx) => {
    if (value.newPassword !== value.confirmPassword) {
      ctx.addIssue({
        code: 'custom',
        message: 'Passwords do not match',
        path: ['confirmPassword'],
      })
    }
    if (value.newPassword === value.currentPassword) {
      ctx.addIssue({
        code: 'custom',
        message: 'New password must be different from the current password',
        path: ['newPassword'],
      })
    }
  })

export type AccountPasswordValues = z.infer<typeof accountPasswordSchema>
