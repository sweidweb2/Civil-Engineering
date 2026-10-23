import { z } from 'zod'

function blankToNull(value: unknown) {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  return typeof value === 'string' ? value.trim() : value
}

function patchText(max: number) {
  return z.preprocess(blankToNull, z.string().max(max).nullable().optional())
}

function patchYears() {
  return z.preprocess((value) => {
    const next = blankToNull(value)
    if (next === undefined || next === null) return next
    if (typeof next === 'number') return next
    if (typeof next === 'string' && next.trim()) {
      const parsed = Number.parseInt(next, 10)
      return Number.isFinite(parsed) ? parsed : next
    }
    return next
  }, z.number().int().min(0).max(80).nullable().optional())
}

const patchUrl = z.preprocess(blankToNull, z.string().url().max(500).nullable().optional())

/** Full replace/upsert body used by PUT /manager-profiles/me. */
export const upsertManagerProfileBodySchema = z.object({
  headline: patchText(160),
  bio: patchText(4000),
  yearsExperience: patchYears(),
  specialty: patchText(200),
  education: patchText(2000),
  certifications: patchText(2000),
  skills: patchText(2000),
  languages: patchText(500),
  city: patchText(80),
  country: patchText(80),
  website: patchUrl,
  linkedinUrl: patchUrl,
  cvUrl: patchUrl,
  availability: patchText(500),
  projectTypes: patchText(1000),
})

export type UpsertManagerProfileBody = z.infer<typeof upsertManagerProfileBodySchema>
