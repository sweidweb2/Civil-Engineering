import { z } from 'zod'

export const providerProfileSchema = z.object({
  firstName: z.string().trim().max(100, 'Max 100 characters'),
  lastName: z.string().trim().max(100, 'Max 100 characters'),
  displayName: z.string().trim().max(120, 'Max 120 characters'),
  phone: z.string().trim().max(20, 'Max 20 characters'),
})

export type ProviderProfileValues = z.infer<typeof providerProfileSchema>

export const providerPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required').max(128),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128)
      .regex(/[A-Za-z]/, 'Password must include a letter')
      .regex(/[0-9]/, 'Password must include a number'),
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
        message: 'New password must be different',
        path: ['newPassword'],
      })
    }
  })

export type ProviderPasswordValues = z.infer<typeof providerPasswordSchema>
