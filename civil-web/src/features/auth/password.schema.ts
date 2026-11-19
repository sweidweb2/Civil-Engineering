import { z } from 'zod'

import i18n from '@/i18n'

/** Matches backend `password.schema` (register / change-password). Messages follow locale. */
export const passwordValueSchema = z
  .string()
  .min(8, { error: () => i18n.t('validation:passwordMin') })
  .max(128, { error: () => i18n.t('validation:maxLength', { max: 128 }) })
  .regex(/[A-Za-z]/, { error: () => i18n.t('validation:passwordLetter') })
  .regex(/[0-9]/, { error: () => i18n.t('validation:passwordNumber') })

/** Change-password form: current + new + confirm. */
export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, { error: () => i18n.t('validation:required') })
      .max(128),
    newPassword: passwordValueSchema,
    confirmPassword: z
      .string()
      .min(1, { error: () => i18n.t('validation:required') })
      .max(128),
  })
  .superRefine((value, ctx) => {
    if (value.newPassword !== value.confirmPassword) {
      ctx.addIssue({
        code: 'custom',
        message: i18n.t('validation:passwordsMismatch'),
        path: ['confirmPassword'],
      })
    }
    if (value.newPassword === value.currentPassword) {
      ctx.addIssue({
        code: 'custom',
        message: i18n.t('validation:passwordDifferent'),
        path: ['newPassword'],
      })
    }
  })

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>
