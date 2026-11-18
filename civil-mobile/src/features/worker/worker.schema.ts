import { z } from 'zod'

function blankToNull(value: unknown) {
  if (value === null || value === '' || value === undefined) return null
  return typeof value === 'string' ? value.trim() : value
}

function text(max: number) {
  return z.preprocess(blankToNull, z.string().max(max).nullable())
}

function years() {
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

function year() {
  return z.preprocess((value) => {
    const next = blankToNull(value)
    if (next === null) return null
    if (typeof next === 'number') return next
    if (typeof next === 'string' && next.trim()) {
      const parsed = Number.parseInt(next, 10)
      return Number.isFinite(parsed) ? parsed : next
    }
    return next
  }, z.number().int().min(1950).max(2100).nullable())
}

function money() {
  return z.preprocess(
    (value) => {
      const next = blankToNull(value)
      if (next === null) return null
      if (typeof next === 'number') return String(next)
      if (typeof next === 'string') return next.trim()
      return next
    },
    z
      .string()
      .regex(/^\d+(\.\d{1,4})?$/, 'Enter a valid amount')
      .max(24)
      .nullable(),
  )
}

const dateField = z.preprocess(
  blankToNull,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
    .nullable(),
)
const urlField = z.preprocess(blankToNull, z.string().url('Enter a valid URL').max(500).nullable())

export const workerBasicsSchema = z.object({
  headline: text(160),
  bio: text(4000),
  primaryTrade: text(120),
  yearsExperience: years(),
  languages: text(500),
  city: text(80),
  country: text(80),
})

export const workerRatesSchema = z
  .object({
    hourlyRate: money(),
    dailyRate: money(),
    currency: text(8),
    availability: z.enum(['AVAILABLE', 'BUSY', 'UNAVAILABLE']),
    isPublic: z.boolean(),
    cvUrl: urlField,
  })
  .superRefine((value, ctx) => {
    if ((value.hourlyRate || value.dailyRate) && !value.currency) {
      ctx.addIssue({
        code: 'custom',
        message: 'Currency is required when a rate is set',
        path: ['currency'],
      })
    }
  })

export const workerExperienceSchema = z
  .object({
    company: z.string().trim().min(1, 'Company is required').max(160),
    roleTitle: z.string().trim().min(1, 'Role is required').max(160),
    projectType: text(120),
    location: text(160),
    startDate: dateField,
    endDate: dateField,
    isCurrent: z.boolean(),
    description: text(2000),
  })
  .superRefine((value, ctx) => {
    if (value.isCurrent && value.endDate) {
      ctx.addIssue({
        code: 'custom',
        message: 'Current roles cannot have an end date',
        path: ['endDate'],
      })
    }
    if (value.startDate && value.endDate && value.endDate < value.startDate) {
      ctx.addIssue({
        code: 'custom',
        message: 'End date must be after start date',
        path: ['endDate'],
      })
    }
  })

/** Full list validation used when saving multiple experiences in one PUT. */
export const workerExperiencesListSchema = z
  .array(workerExperienceSchema)
  .max(30)
  .superRefine((items, ctx) => {
    if (items.filter((item) => item.isCurrent).length > 1) {
      ctx.addIssue({
        code: 'custom',
        message: 'Only one experience can be marked as current',
        path: [],
      })
    }
  })

export const workerEducationSchema = z
  .object({
    school: z.string().trim().min(1, 'School is required').max(160),
    degree: text(120),
    field: text(120),
    startYear: year(),
    endYear: year(),
  })
  .superRefine((value, ctx) => {
    if (value.startYear != null && value.endYear != null && value.endYear < value.startYear) {
      ctx.addIssue({
        code: 'custom',
        message: 'End year must be after start year',
        path: ['endYear'],
      })
    }
  })

export const workerCertificationSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(160),
    issuer: text(160),
    issuedAt: dateField,
    expiresAt: dateField,
    credentialId: text(120),
  })
  .superRefine((value, ctx) => {
    if (value.issuedAt && value.expiresAt && value.expiresAt < value.issuedAt) {
      ctx.addIssue({
        code: 'custom',
        message: 'Expiry must be after issue date',
        path: ['expiresAt'],
      })
    }
  })

export const workerSkillItemSchema = z.object({
  categoryId: z.string().trim().min(1, 'Pick a trade'),
  level: z.enum(['BASIC', 'INTERMEDIATE', 'EXPERT']),
})

export type WorkerBasicsValues = z.infer<typeof workerBasicsSchema>
export type WorkerRatesValues = z.infer<typeof workerRatesSchema>
export type WorkerExperienceValues = z.infer<typeof workerExperienceSchema>
export type WorkerEducationValues = z.infer<typeof workerEducationSchema>
export type WorkerCertificationValues = z.infer<typeof workerCertificationSchema>
export type WorkerSkillItemValues = z.infer<typeof workerSkillItemSchema>
