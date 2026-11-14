import { z } from 'zod'

function blankToNull(value: unknown) {
  if (value === null || value === '' || value === undefined) return null
  return typeof value === 'string' ? value.trim() : value
}

function putText(max: number) {
  return z.preprocess(blankToNull, z.string().max(max).nullable())
}

function putYears() {
  return z.preprocess((value) => {
    const next = blankToNull(value)
    if (next === null) return null
    if (typeof next === 'number') return next
    if (typeof next === 'string' && next.trim()) {
      const parsed = Number.parseInt(next, 10)
      return Number.isFinite(parsed) ? parsed : next
    }
    return next
  }, z.number().int().min(0).max(80).nullable())
}

const putUrl = z.preprocess(blankToNull, z.string().url().max(500).nullable())

const EMPTY_PROFILE_PUT = {
  headline: null,
  bio: null,
  yearsExperience: null,
  specialty: null,
  education: null,
  certifications: null,
  skills: null,
  languages: null,
  city: null,
  country: null,
  website: null,
  linkedinUrl: null,
  cvUrl: null,
  availability: null,
  projectTypes: null,
} as const

/**
 * Full replace body for PUT /manager-profiles/me.
 * Missing keys default to null so a PUT cannot leave stale fields behind.
 */
export const upsertManagerProfileBodySchema = z.preprocess(
  (raw) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return { ...EMPTY_PROFILE_PUT }
    }
    return { ...EMPTY_PROFILE_PUT, ...(raw as Record<string, unknown>) }
  },
  z.object({
    headline: putText(160),
    bio: putText(4000),
    yearsExperience: putYears(),
    specialty: putText(200),
    education: putText(2000),
    certifications: putText(2000),
    skills: putText(2000),
    languages: putText(500),
    city: putText(80),
    country: putText(80),
    website: putUrl,
    linkedinUrl: putUrl,
    cvUrl: putUrl,
    availability: putText(500),
    projectTypes: putText(1000),
  }),
)

export type UpsertManagerProfileBody = z.infer<typeof upsertManagerProfileBodySchema>
