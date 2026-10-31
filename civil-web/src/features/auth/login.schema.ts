import { z } from 'zod'

import i18n from '@/i18n'

// Messages are resolved lazily (at parse time) so they follow the active locale.
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { error: () => i18n.t('validation:required') })
    .email({ error: () => i18n.t('validation:emailInvalid') }),
  password: z
    .string()
    .min(1, { error: () => i18n.t('validation:required') })
    .max(128, { error: () => i18n.t('validation:maxLength', { max: 128 }) }),
})

export type LoginValues = z.infer<typeof loginSchema>
