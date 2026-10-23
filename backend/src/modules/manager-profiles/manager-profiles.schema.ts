import { z } from 'zod'

function blankToUndefined(value: unknown) {
  if (value == null || value === '') return undefined
  return typeof value === 'string' ? value.trim() : value
}

function blankToNull(value: unknown) {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  return typeof value === 'string' ? value.trim() : value
}

function optionalText(max: number) {
  return z.preprocess(blankToUndefined, z.string().max(max).optional())
}

function patchText(max: number) {
  return z.preprocess(blankToNull, z.string().max(max).nullable().optional())
}

function optionalYears() {
  return z.preprocess((value) => {
    const next = blankToUndefined(value)
    if (next === undefined) return undefined
    if (typeof next === 'number') return next
    if (typeof next === 'string' && next.trim()) {
      const parsed = Number.parseInt(next, 10)
      return Number.isFinite(parsed) ? parsed : next
    }
    return next
  }, z.number().int().min(0).max(80).optional())
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

const optionalUrl = z.preprocess(blankToUndefined, z.string().url().max(500).optional())
const patchUrl = z.preprocess(blankToNull, z.string().url().max(500).nullable().optional())

const managerProfileFields = {
  headline: optionalText(160),
  bio: optionalText(4000),
  yearsExperience: optionalYears(),
  specialty: optionalText(200),
  education: optionalText(2000),
  certifications: optionalText(2000),
  skills: optionalText(2000),
  languages: optionalText(500),
  city: optionalText(80),
  country: optionalText(80),
  website: optionalUrl,
  linkedinUrl: optionalUrl,
  cvUrl: optionalUrl,
  availability: optionalText(500),
  projectTypes: optionalText(1000),
}

export const createManagerProfileBodySchema = z.object(managerProfileFields)

export const updateManagerProfileBodySchema = z
  .object({
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
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  })

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

export type CreateManagerProfileBody = z.infer<typeof createManagerProfileBodySchema>
export type UpdateManagerProfileBody = z.infer<typeof updateManagerProfileBodySchema>
export type UpsertManagerProfileBody = z.infer<typeof upsertManagerProfileBodySchema>
