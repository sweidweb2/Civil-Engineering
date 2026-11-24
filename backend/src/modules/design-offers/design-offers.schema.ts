import { z } from 'zod'

import { paginationQuerySchema } from '../_shared/pagination.schema.js'

const DECIMAL_PATTERN = /^\d{1,14}(\.\d{1,4})?$/

function decimalText(label: string) {
  return z.string().trim().regex(DECIMAL_PATTERN, `${label} must be a decimal with up to 4 places`)
}

function priceRangeOk(value: { priceStart: string; priceEnd: string }) {
  return Number(value.priceStart) <= Number(value.priceEnd)
}

export const designOfferIdParamsSchema = z.object({
  id: z.string().trim().min(1),
})

export const listDesignOffersQuerySchema = paginationQuerySchema.extend({
  q: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().max(80).optional(),
  ),
  /** When true, only active offers (PM catalog). Admins omit this to see all. */
  activeOnly: z.preprocess((value) => {
    if (value === 'true' || value === '1' || value === true) return true
    if (value === 'false' || value === '0' || value === false) return false
    return value
  }, z.boolean().optional()),
})

export const createDesignOfferBodySchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().min(1).max(5000),
    priceStart: decimalText('Price start'),
    priceEnd: decimalText('Price end'),
    currency: z.string().trim().min(1).max(8).default('USD'),
    isActive: z.boolean().optional(),
    sortOrder: z.coerce.number().int().min(0).max(10000).optional(),
  })
  .refine(priceRangeOk, { message: 'priceStart must be less than or equal to priceEnd' })

export const updateDesignOfferBodySchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().min(1).max(5000).optional(),
    priceStart: decimalText('Price start').optional(),
    priceEnd: decimalText('Price end').optional(),
    currency: z.string().trim().min(1).max(8).optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.coerce.number().int().min(0).max(10000).optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'At least one field is required',
  })
  .superRefine((value, ctx) => {
    if (value.priceStart !== undefined && value.priceEnd !== undefined) {
      if (Number(value.priceStart) > Number(value.priceEnd)) {
        ctx.addIssue({
          code: 'custom',
          message: 'priceStart must be less than or equal to priceEnd',
          path: ['priceEnd'],
        })
      }
    }
  })

export type CreateDesignOfferBody = z.infer<typeof createDesignOfferBodySchema>
export type UpdateDesignOfferBody = z.infer<typeof updateDesignOfferBodySchema>
export type ListDesignOffersQuery = z.infer<typeof listDesignOffersQuerySchema>
