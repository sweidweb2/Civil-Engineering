import { z } from 'zod'

import { paginationQuerySchema } from '../_shared/pagination.schema.js'
import { DESIGN_CATEGORIES } from './design-requests.types.js'

export const designCategorySchema = z.enum(DESIGN_CATEGORIES)

export const designRequestStatusSchema = z.enum([
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'REJECTED',
  'CANCELLED',
])

export const designRequestIdParamsSchema = z.object({
  id: z.string().trim().min(1),
})

const optionalProjectId = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) return null
  return value
}, z.string().trim().min(1).nullable().optional())

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

const neededBySchema = z.coerce.date().refine(
  (value) => {
    const today = startOfUtcDay(new Date())
    return startOfUtcDay(value).getTime() >= today.getTime()
  },
  { message: 'neededBy must be today or a future date' },
)

const optionalDesignOfferId = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) return null
  return value
}, z.string().trim().min(1).nullable().optional())

/** JSON create body (no file). */
export const createDesignRequestBodySchema = z.object({
  subject: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(5000),
  category: designCategorySchema,
  neededBy: neededBySchema,
  projectId: optionalProjectId,
  designOfferId: optionalDesignOfferId,
})

/**
 * Multipart fields arrive as strings. Coerce neededBy; empty projectId → null.
 * File is validated separately in the controller.
 */
export const createDesignRequestFieldsSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(5000),
  category: designCategorySchema,
  neededBy: neededBySchema,
  projectId: optionalProjectId,
  designOfferId: optionalDesignOfferId,
})

export const listDesignRequestsQuerySchema = paginationQuerySchema.extend({
  status: designRequestStatusSchema.optional(),
  projectId: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().min(1).optional(),
  ),
})

export const updateDesignRequestStatusBodySchema = z.object({
  status: designRequestStatusSchema,
})

export type CreateDesignRequestBody = z.infer<typeof createDesignRequestBodySchema>
export type ListDesignRequestsQuery = z.infer<typeof listDesignRequestsQuerySchema>
export type UpdateDesignRequestStatusBody = z.infer<typeof updateDesignRequestStatusBodySchema>
