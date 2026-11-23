import type { TFunction } from 'i18next'
import { z } from 'zod'

import type { ManagerProfile, ManagerProfileInput } from '@/services/managerProfiles'

/** Mirrors backend `upsertManagerProfileBodySchema` (UX only; backend is the boundary). */
function blankToNull(value: unknown) {
  if (value === null || value === '' || value === undefined) return null
  return typeof value === 'string' ? value.trim() : value
}

function text(max: number) {
  return z.preprocess(blankToNull, z.string().max(max).nullable())
}

function url(t: TFunction) {
  return z.preprocess(blankToNull, z.string().url(t('validation.urlInvalid')).max(500).nullable())
}

export function managerProfileSchema(t: TFunction) {
  return z.object({
    headline: text(160),
    bio: text(4000),
    yearsExperience: z.preprocess(
      (value) => {
        const next = blankToNull(value)
        if (typeof next === 'string' && /^\d+$/.test(next)) return Number.parseInt(next, 10)
        return next
      },
      z
        .number({ message: t('validation.wholeYears') })
        .int()
        .min(0)
        .max(80)
        .nullable(),
    ),
    specialty: text(200),
    education: text(2000),
    certifications: text(2000),
    skills: text(2000),
    languages: text(500),
    city: text(80),
    country: text(80),
    website: url(t),
    linkedinUrl: url(t),
    cvUrl: url(t),
    availability: text(500),
    projectTypes: text(1000),
  }) satisfies z.ZodType<ManagerProfileInput, unknown>
}

/** Form state keeps every field as text so inputs stay controlled. */
export type ManagerProfileForm = Record<keyof ManagerProfileInput, string>

export const MANAGER_PROFILE_FIELDS: (keyof ManagerProfileInput)[] = [
  'headline',
  'bio',
  'yearsExperience',
  'specialty',
  'education',
  'certifications',
  'skills',
  'languages',
  'city',
  'country',
  'website',
  'linkedinUrl',
  'cvUrl',
  'availability',
  'projectTypes',
]

export function formFromManagerProfile(profile: ManagerProfile | null): ManagerProfileForm {
  const form = {} as ManagerProfileForm
  for (const key of MANAGER_PROFILE_FIELDS) {
    const value = profile?.[key]
    form[key] = value == null ? '' : String(value)
  }
  return form
}
