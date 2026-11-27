import { z } from 'zod'

import { countsQuerySchema } from '../_shared/counts.schema.js'
import { paginationQuerySchema } from '../_shared/pagination.schema.js'

export const projectIdParamsSchema = z.object({
  id: z.string().trim().min(1, 'Project ID is required'),
})

const optionalSearchQuery = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().max(120).optional(),
)

export const listProjectsQuerySchema = paginationQuerySchema.extend({
  status: z
    .enum(['DRAFT', 'PLANNING', 'APPROVED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'])
    .optional(),
  type: z
    .enum(['RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL', 'INFRASTRUCTURE', 'RENOVATION', 'OTHER'])
    .optional(),
  q: optionalSearchQuery,
  /** When true, attach status aggregate summary in the same response (PM home / list). */
  includeSummary: countsQuerySchema,
})

// Minimal create - just essential info
export const createProjectBodySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Project name is required')
      .max(200, 'Project name must be at most 200 characters'),
    description: z
      .string()
      .trim()
      .max(2000, 'Description must be at most 2000 characters')
      .optional()
      .or(z.literal('')),
    code: z
      .string()
      .trim()
      .max(50, 'Project code must be at most 50 characters')
      .optional()
      .or(z.literal('')),
    type: z
      .enum(['RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL', 'INFRASTRUCTURE', 'RENOVATION', 'OTHER'])
      .optional(),
    startDate: z.union([z.string().datetime(), z.null()]).optional(),
    endDate: z.union([z.string().datetime(), z.null()]).optional(),
  })
  .refine(
    (value) =>
      !value.startDate ||
      !value.endDate ||
      new Date(value.endDate).getTime() > new Date(value.startDate).getTime(),
    { message: 'End date must be after the start date', path: ['endDate'] },
  )

// Update allows all fields. `expectedUpdatedAt` is the optimistic-concurrency token.
export const updateProjectBodySchema = z
  .object({
    expectedUpdatedAt: z.string().datetime({ offset: true }),
    name: z
      .string()
      .trim()
      .min(1)
      .max(200, 'Project name must be at most 200 characters')
      .optional(),
    description: z
      .string()
      .trim()
      .max(2000, 'Description must be at most 2000 characters')
      .optional()
      .or(z.literal('')),
    code: z
      .string()
      .trim()
      .max(50, 'Project code must be at most 50 characters')
      .optional()
      .or(z.literal('')),
    address: z.string().trim().max(500).optional().or(z.literal('')),
    city: z.string().trim().max(100).optional().or(z.literal('')),
    country: z.string().trim().max(100).optional().or(z.literal('')),
    startDate: z.union([z.string().datetime(), z.null()]).optional(),
    endDate: z.union([z.string().datetime(), z.null()]).optional(),
    actualStartDate: z.string().datetime().optional(),
    actualEndDate: z.string().datetime().optional(),
    status: z
      .enum(['DRAFT', 'PLANNING', 'APPROVED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'])
      .optional(),
    budget: z.string().optional(),
    currency: z.string().min(3).max(3).optional(),
    actualCost: z.string().optional(),
    type: z
      .enum(['RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL', 'INFRASTRUCTURE', 'RENOVATION', 'OTHER'])
      .optional(),
    isPublic: z.boolean().optional(),
    notes: z.string().trim().optional().or(z.literal('')),
  })
  .refine(
    (value) => {
      const { expectedUpdatedAt: _token, ...rest } = value
      return Object.values(rest).some((field) => field !== undefined)
    },
    { message: 'At least one field is required' },
  )

export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>
export type CreateProjectBody = z.infer<typeof createProjectBodySchema>
export type UpdateProjectBody = z.infer<typeof updateProjectBodySchema>
