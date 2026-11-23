import type { TFunction } from 'i18next'
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

function money(t: TFunction) {
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
      .regex(/^\d+(\.\d{1,4})?$/, t('validation.amountInvalid'))
      .max(24)
      .nullable(),
  )
}

function dateField(t: TFunction) {
  return z.preprocess(
    blankToNull,
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, t('validation.dateFormat'))
      .nullable(),
  )
}

function urlField(t: TFunction) {
  return z.preprocess(blankToNull, z.string().url(t('validation.urlInvalid')).max(500).nullable())
}

export const workerBasicsSchema = z.object({
  headline: text(160),
  bio: text(4000),
  primaryTrade: text(120),
  yearsExperience: years(),
  languages: text(500),
  city: text(80),
  country: text(80),
})

export function workerRatesSchema(t: TFunction) {
  return z
    .object({
      hourlyRate: money(t),
      dailyRate: money(t),
      currency: text(8),
      availability: z.enum(['AVAILABLE', 'BUSY', 'UNAVAILABLE']),
      isPublic: z.boolean(),
      cvUrl: urlField(t),
    })
    .superRefine((value, ctx) => {
      if ((value.hourlyRate || value.dailyRate) && !value.currency) {
        ctx.addIssue({
          code: 'custom',
          message: t('validation.currencyRequiredWithRate'),
          path: ['currency'],
        })
      }
    })
}

export function workerExperienceSchema(t: TFunction) {
  return z
    .object({
      company: z.string().trim().min(1, t('validation.companyRequired')).max(160),
      roleTitle: z.string().trim().min(1, t('validation.roleRequired')).max(160),
      projectType: text(120),
      location: text(160),
      startDate: dateField(t),
      endDate: dateField(t),
      isCurrent: z.boolean(),
      description: text(2000),
    })
    .superRefine((value, ctx) => {
      if (value.isCurrent && value.endDate) {
        ctx.addIssue({
          code: 'custom',
          message: t('validation.currentRoleNoEndDate'),
          path: ['endDate'],
        })
      }
      if (value.startDate && value.endDate && value.endDate < value.startDate) {
        ctx.addIssue({
          code: 'custom',
          message: t('validation.endAfterStart'),
          path: ['endDate'],
        })
      }
    })
}

/** Full list validation used when saving multiple experiences in one PUT. */
export function workerExperiencesListSchema(t: TFunction) {
  return z
    .array(workerExperienceSchema(t))
    .max(30)
    .superRefine((items, ctx) => {
      if (items.filter((item) => item.isCurrent).length > 1) {
        ctx.addIssue({
          code: 'custom',
          message: t('validation.onlyOneCurrentExperience'),
          path: [],
        })
      }
    })
}

export function workerEducationSchema(t: TFunction) {
  return z
    .object({
      school: z.string().trim().min(1, t('validation.schoolRequired')).max(160),
      degree: text(120),
      field: text(120),
      startYear: year(),
      endYear: year(),
    })
    .superRefine((value, ctx) => {
      if (value.startYear != null && value.endYear != null && value.endYear < value.startYear) {
        ctx.addIssue({
          code: 'custom',
          message: t('validation.endYearAfterStart'),
          path: ['endYear'],
        })
      }
    })
}

export function workerCertificationSchema(t: TFunction) {
  return z
    .object({
      name: z.string().trim().min(1, t('validation.nameRequired')).max(160),
      issuer: text(160),
      issuedAt: dateField(t),
      expiresAt: dateField(t),
      credentialId: text(120),
    })
    .superRefine((value, ctx) => {
      if (value.issuedAt && value.expiresAt && value.expiresAt < value.issuedAt) {
        ctx.addIssue({
          code: 'custom',
          message: t('validation.expiryAfterIssue'),
          path: ['expiresAt'],
        })
      }
    })
}

export function workerSkillItemSchema(t: TFunction) {
  return z.object({
    categoryId: z.string().trim().min(1, t('validation.pickTrade')),
    level: z.enum(['BASIC', 'INTERMEDIATE', 'EXPERT']),
  })
}

export type WorkerBasicsValues = z.infer<typeof workerBasicsSchema>
export type WorkerRatesValues = z.infer<ReturnType<typeof workerRatesSchema>>
export type WorkerExperienceValues = z.infer<ReturnType<typeof workerExperienceSchema>>
export type WorkerEducationValues = z.infer<ReturnType<typeof workerEducationSchema>>
export type WorkerCertificationValues = z.infer<ReturnType<typeof workerCertificationSchema>>
export type WorkerSkillItemValues = z.infer<ReturnType<typeof workerSkillItemSchema>>
