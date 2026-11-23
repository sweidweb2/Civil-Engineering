import type { TFunction } from 'i18next'
import { z } from 'zod'

/** Matches backend `password.schema` (register / change-password). */
export function passwordSchema(t: TFunction) {
  return z
    .string()
    .min(8, t('validation.passwordMin'))
    .max(128, t('validation.passwordMax'))
    .regex(/[A-Za-z]/, t('validation.passwordLetter'))
    .regex(/[0-9]/, t('validation.passwordNumber'))
}
