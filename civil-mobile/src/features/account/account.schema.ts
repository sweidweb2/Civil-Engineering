import type { TFunction } from 'i18next'
import { z } from 'zod'

import { passwordSchema } from '@/features/auth/password.schema'

/** Shared profile fields for the signed-in account (client / provider / worker settings). */
export function accountProfileSchema(t: TFunction) {
  return z.object({
    firstName: z
      .string()
      .trim()
      .max(100, t('validation.maxChars', { count: 100 })),
    lastName: z
      .string()
      .trim()
      .max(100, t('validation.maxChars', { count: 100 })),
    displayName: z
      .string()
      .trim()
      .max(120, t('validation.maxChars', { count: 120 })),
    phone: z
      .string()
      .trim()
      .max(20, t('validation.maxChars', { count: 20 })),
  })
}

export type AccountProfileValues = z.infer<ReturnType<typeof accountProfileSchema>>

export function accountPasswordSchema(t: TFunction) {
  return z
    .object({
      currentPassword: z.string().min(1, t('validation.currentPasswordRequired')).max(128),
      newPassword: passwordSchema(t),
      confirmPassword: z.string().min(1, t('validation.confirmPasswordRequired')).max(128),
    })
    .superRefine((value, ctx) => {
      if (value.newPassword !== value.confirmPassword) {
        ctx.addIssue({
          code: 'custom',
          message: t('validation.passwordsMismatch'),
          path: ['confirmPassword'],
        })
      }
      if (value.newPassword === value.currentPassword) {
        ctx.addIssue({
          code: 'custom',
          message: t('validation.passwordSameAsCurrent'),
          path: ['newPassword'],
        })
      }
    })
}

export type AccountPasswordValues = z.infer<ReturnType<typeof accountPasswordSchema>>
