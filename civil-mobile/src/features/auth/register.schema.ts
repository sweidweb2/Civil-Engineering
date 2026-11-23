import type { TFunction } from 'i18next'
import { z } from 'zod'

import { passwordSchema } from './password.schema'

export const registerRoleSchema = z.enum(['CLIENT', 'WORKER', 'MANAGER'])

export function registerSchema(t: TFunction) {
  return z.object({
    firstName: z.string().trim().max(80),
    lastName: z.string().trim().max(80),
    email: z
      .string()
      .trim()
      .min(1, t('validation.emailRequired'))
      .email(t('validation.emailInvalid')),
    password: passwordSchema(t),
    role: registerRoleSchema,
  })
}

export type RegisterValues = z.infer<ReturnType<typeof registerSchema>>
