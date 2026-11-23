import type { TFunction } from 'i18next'
import { z } from 'zod'

export function loginSchema(t: TFunction) {
  return z.object({
    email: z
      .string()
      .trim()
      .min(1, t('validation.emailRequired'))
      .email(t('validation.emailInvalid')),
    password: z.string().min(1, t('validation.passwordRequired')).max(128),
  })
}

export type LoginValues = z.infer<ReturnType<typeof loginSchema>>
