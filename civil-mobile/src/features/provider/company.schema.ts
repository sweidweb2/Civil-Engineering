import type { TFunction } from 'i18next'
import { z } from 'zod'

export function providerCompanySchema(t: TFunction) {
  return z.object({
    name: z.string().trim().min(1, t('validation.companyNameRequired')).max(120),
    description: z.string().trim().max(2000),
    phone: z.string().trim().max(20),
    whatsapp: z.string().trim().max(20),
    email: z
      .string()
      .trim()
      .max(160)
      .refine((value) => value.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
        message: t('validation.emailInvalid'),
      }),
    website: z.string().trim().max(200),
    address: z.string().trim().max(200),
    city: z.string().trim().max(80),
    country: z.string().trim().max(80),
  })
}

export type ProviderCompanyValues = z.infer<ReturnType<typeof providerCompanySchema>>

export const EMPTY_COMPANY: ProviderCompanyValues = {
  name: '',
  description: '',
  phone: '',
  whatsapp: '',
  email: '',
  website: '',
  address: '',
  city: '',
  country: '',
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function companyWriteFromForm(form: ProviderCompanyValues) {
  return {
    name: form.name.trim(),
    description: emptyToNull(form.description),
    phone: emptyToNull(form.phone),
    whatsapp: emptyToNull(form.whatsapp),
    email: emptyToNull(form.email),
    website: emptyToNull(form.website),
    address: emptyToNull(form.address),
    city: emptyToNull(form.city),
    country: emptyToNull(form.country),
  }
}
