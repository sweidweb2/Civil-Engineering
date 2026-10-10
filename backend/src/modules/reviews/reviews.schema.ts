import { z } from 'zod'

import { paginationQuerySchema } from '../_shared/pagination.schema.js'

export const reviewStatusSchema = z.enum(['PENDING', 'ACCEPTED', 'REJECTED'])
export const reviewTargetTypeSchema = z.enum(['PROVIDER', 'WORKER', 'LISTING'])

export const reviewIdParamsSchema = z.object({
  id: z.string().trim().min(1),
})

const optionalQueryText = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().max(120).optional(),
)

export const listReviewsQuerySchema = paginationQuerySchema.extend({
  q: optionalQueryText,
  status: reviewStatusSchema.optional(),
  targetType: reviewTargetTypeSchema.optional(),
})

export const listReviewTargetsQuerySchema = z.object({
  targetType: reviewTargetTypeSchema,
})

export const createReviewBodySchema = z.object({
  authorId: z.string().trim().min(1).optional(),
  targetType: reviewTargetTypeSchema,
  targetId: z.string().trim().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().min(1).max(2000),
  status: reviewStatusSchema.optional(),
})

export const updateReviewBodySchema = z
  .object({
    targetType: reviewTargetTypeSchema.optional(),
    targetId: z.string().trim().min(1).optional(),
    rating: z.coerce.number().int().min(1).max(5).optional(),
    comment: z.string().trim().min(1).max(2000).optional(),
    status: reviewStatusSchema.optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'At least one field is required',
  })
  .refine((value) => (value.targetType === undefined) === (value.targetId === undefined), {
    message: 'Target type and target must be updated together',
    path: ['targetId'],
  })

export type ReviewStatus = z.infer<typeof reviewStatusSchema>
export type ReviewTargetType = z.infer<typeof reviewTargetTypeSchema>

export type ListReviewsQuery = {
  page: number
  limit: number
  q?: string
  status?: ReviewStatus
  targetType?: ReviewTargetType
}

export type CreateReviewBody = {
  authorId?: string
  targetType: ReviewTargetType
  targetId: string
  rating: number
  comment: string
  status?: ReviewStatus
}

export type UpdateReviewBody = {
  targetType?: ReviewTargetType
  targetId?: string
  rating?: number
  comment?: string
  status?: ReviewStatus
}
