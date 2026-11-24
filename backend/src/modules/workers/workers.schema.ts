import { z } from 'zod'

import { countsQuerySchema } from '../_shared/counts.schema.js'
import { paginationQuerySchema } from '../_shared/pagination.schema.js'

export const workerAvailabilitySchema = z.enum(['AVAILABLE', 'BUSY', 'UNAVAILABLE'])
export const workerSkillLevelSchema = z.enum(['BASIC', 'INTERMEDIATE', 'EXPERT'])
export const verificationStatusSchema = z.enum(['UNVERIFIED', 'REQUESTED', 'VERIFIED'])

export const workerUserIdParamsSchema = z.object({
  userId: z.string().trim().min(1),
})

export const listWorkersQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().max(120).optional(),
  city: z.string().trim().max(80).optional(),
  country: z.string().trim().max(80).optional(),
  categoryId: z.string().trim().min(1).optional(),
  /** Exact specialty key from the client specialty dictionary. */
  specialty: z.string().trim().min(1).max(120).optional(),
  availability: workerAvailabilitySchema.optional(),
  /** Admin-only filter; ignored for non-admins (public path forces VERIFIED). */
  verificationStatus: verificationStatusSchema.optional(),
  counts: countsQuerySchema,
})

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

function putYear() {
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

function putMoney() {
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
      .regex(/^\d+(\.\d{1,4})?$/, 'Invalid money amount')
      .max(24)
      .nullable(),
  )
}

const putUrl = z.preprocess(blankToNull, z.string().url().max(500).nullable())

/** ISO date `YYYY-MM-DD` or null. */
const putDate = z.preprocess(blankToNull, z.string().date().nullable())

const experienceItemSchema = z
  .object({
    company: z.string().trim().min(1).max(160),
    roleTitle: z.string().trim().min(1).max(160),
    projectType: putText(120),
    location: putText(160),
    startDate: putDate,
    endDate: putDate,
    isCurrent: z.boolean().default(false),
    description: putText(2000),
    sortOrder: z.number().int().min(0).max(999).default(0),
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
        message: 'endDate must be on or after startDate',
        path: ['endDate'],
      })
    }
  })

const educationItemSchema = z
  .object({
    school: z.string().trim().min(1).max(160),
    degree: putText(120),
    field: putText(120),
    startYear: putYear(),
    endYear: putYear(),
    sortOrder: z.number().int().min(0).max(999).default(0),
  })
  .superRefine((value, ctx) => {
    if (value.startYear != null && value.endYear != null && value.endYear < value.startYear) {
      ctx.addIssue({
        code: 'custom',
        message: 'endYear must be on or after startYear',
        path: ['endYear'],
      })
    }
  })

const certificationItemSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    issuer: putText(160),
    issuedAt: putDate,
    expiresAt: putDate,
    credentialId: putText(120),
    sortOrder: z.number().int().min(0).max(999).default(0),
  })
  .superRefine((value, ctx) => {
    if (value.issuedAt && value.expiresAt && value.expiresAt < value.issuedAt) {
      ctx.addIssue({
        code: 'custom',
        message: 'expiresAt must be on or after issuedAt',
        path: ['expiresAt'],
      })
    }
  })

const skillItemSchema = z.object({
  categoryId: z.string().trim().min(1),
  level: workerSkillLevelSchema.default('INTERMEDIATE'),
})

/**
 * Full replace body for PUT /workers/me.
 * All document keys are required so a partial PUT cannot silently wipe children.
 * `expectedUpdatedAt` is the optimistic-concurrency token (`null` only for first create).
 */
export const upsertWorkerProfileBodySchema = z
  .object({
    headline: putText(160),
    bio: putText(4000),
    specialty: putText(120),
    yearsExperience: putYears(),
    languages: putText(500),
    city: putText(80),
    country: putText(80),
    hourlyRate: putMoney(),
    dailyRate: putMoney(),
    currency: putText(8),
    availability: workerAvailabilitySchema,
    isPublic: z.boolean(),
    cvUrl: putUrl,
    experiences: z.array(experienceItemSchema).max(30),
    education: z.array(educationItemSchema).max(20),
    certifications: z.array(certificationItemSchema).max(30),
    skills: z
      .array(skillItemSchema)
      .max(40)
      .superRefine((items, ctx) => {
        const seen = new Set<string>()
        for (const [index, item] of items.entries()) {
          if (seen.has(item.categoryId)) {
            ctx.addIssue({
              code: 'custom',
              message: 'Duplicate skill category',
              path: [index, 'categoryId'],
            })
          }
          seen.add(item.categoryId)
        }
      }),
    /** ISO timestamp of the CV the client loaded; null only when creating the first profile. */
    expectedUpdatedAt: z.preprocess(blankToNull, z.string().datetime({ offset: true }).nullable()),
  })
  .superRefine((value, ctx) => {
    if (value.hourlyRate == null && value.dailyRate == null) return
    if (!value.currency) {
      ctx.addIssue({
        code: 'custom',
        message: 'currency is required when a rate is set',
        path: ['currency'],
      })
    }
  })
  .superRefine((value, ctx) => {
    const currentCount = value.experiences.filter((item) => item.isCurrent).length
    if (currentCount > 1) {
      ctx.addIssue({
        code: 'custom',
        message: 'Only one experience can be marked as current',
        path: ['experiences'],
      })
    }
  })

export const setWorkerVisibilityBodySchema = z.object({
  isPublic: z.boolean(),
})

export type ListWorkersQuery = z.infer<typeof listWorkersQuerySchema>
export type UpsertWorkerProfileBody = z.infer<typeof upsertWorkerProfileBodySchema>
export type SetWorkerVisibilityBody = z.infer<typeof setWorkerVisibilityBodySchema>
