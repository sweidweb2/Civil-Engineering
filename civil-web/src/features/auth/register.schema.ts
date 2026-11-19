import { z } from 'zod'

import i18n from '@/i18n'

import { passwordValueSchema } from './password.schema'

export const registerRoleSchema = z.enum(['CLIENT', 'WORKER', 'MANAGER'])

// Messages are resolved lazily (at parse time) so they follow the active locale.
export const registerSchema = z.object({
  firstName: z
    .string()
    .trim()
    .max(80, { error: () => i18n.t('validation:maxLength', { max: 80 }) }),
  lastName: z
    .string()
    .trim()
    .max(80, { error: () => i18n.t('validation:maxLength', { max: 80 }) }),
  email: z
    .string()
    .trim()
    .min(1, { error: () => i18n.t('validation:required') })
    .email({ error: () => i18n.t('validation:emailInvalid') }),
  password: passwordValueSchema,
  role: registerRoleSchema,
})

export type RegisterValues = z.infer<typeof registerSchema>
