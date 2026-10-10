import { z } from 'zod'

import { paginationQuerySchema } from '../_shared/pagination.schema.js'

export const listingTypeSchema = z.enum(['MATERIAL', 'EQUIPMENT', 'SERVICE'])
export const listingStatusSchema = z.enum(['ACTIVE', 'INACTIVE'])
export const rentalUnitSchema = z.enum(['HOUR', 'DAY', 'WEEK', 'MONTH'])

const optionalQueryText = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().max(120).optional(),
)

function blankToNull(value: unknown) {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  return typeof value === 'string' ? value.trim() : value
}

function optionalText(max: number, message: string) {
  return z.preprocess(blankToNull, z.string().max(max, message).nullable().optional())
}

/** Decimal(18, 4): up to 14 digits before the point and 4 after. Kept as a string so binary floats are not introduced. */
const DECIMAL_PATTERN = /^\d{1,14}(\.\d{1,4})?$/

function decimalText(label: string) {
  return z
    .string()
    .trim()
    .regex(DECIMAL_PATTERN, `${label} must be a decimal with up to 4 places`)
}

function requiredDecimal(label: string) {
  return z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    decimalText(label),
  )
}

function optionalDecimal(label: string) {
  return z.preprocess((value) => {
    if (value === undefined) return undefined
    if (value === null || value === '') return null
    return value
  }, decimalText(label).nullable().optional())
}

export const listingIdParamsSchema = z.object({
  id: z.string().trim().min(1),
})

export const listListingsQuerySchema = paginationQuerySchema.extend({
  q: optionalQueryText,
  type: listingTypeSchema.optional(),
  status: listingStatusSchema.optional(),
  providerId: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().min(1).optional(),
  ),
})

const listingFields = {
  providerId: z.string().trim().min(1, 'Provider is required'),
  categoryId: z.string().trim().min(1, 'Category is required'),
  type: listingTypeSchema,
  name: z.string().trim().min(1, 'Name is required').max(160, 'Name must be at most 160 characters'),
  description: optionalText(4000, 'Description must be at most 4000 characters'),
  brand: optionalText(120, 'Brand must be at most 120 characters'),
  unit: z.string().trim().min(1, 'Unit is required').max(40, 'Unit must be at most 40 characters'),
  currency: z
    .string()
    .trim()
    .length(3, 'Currency must be a 3-letter code'),
  price: requiredDecimal('Price'),
  rentalPrice: optionalDecimal('Rental price'),
  rentalUnit: z.preprocess(blankToNull, rentalUnitSchema.nullable().optional()),
  quantityAvailable: optionalDecimal('Quantity'),
  status: listingStatusSchema.optional(),
}

function rentalPairOk(value: { rentalPrice?: string | null; rentalUnit?: string | null }) {
  return (value.rentalPrice != null) === (value.rentalUnit != null)
}

function updateRentalPairOk(value: { rentalPrice?: string | null; rentalUnit?: string | null }) {
  const priceSet = value.rentalPrice !== undefined
  const unitSet = value.rentalUnit !== undefined
  if (!priceSet && !unitSet) return true
  if (priceSet !== unitSet) return false
  return rentalPairOk(value)
}

export const createListingBodySchema = z.object(listingFields).refine(rentalPairOk, {
  message: 'Rental price and rental unit must be set together',
  path: ['rentalUnit'],
})

export const updateListingBodySchema = z
  .object({
    providerId: listingFields.providerId.optional(),
    categoryId: listingFields.categoryId.optional(),
    type: listingTypeSchema.optional(),
    name: listingFields.name.optional(),
    description: listingFields.description,
    brand: listingFields.brand,
    unit: listingFields.unit.optional(),
    currency: listingFields.currency.optional(),
    price: requiredDecimal('Price').optional(),
    rentalPrice: listingFields.rentalPrice,
    rentalUnit: listingFields.rentalUnit,
    quantityAvailable: listingFields.quantityAvailable,
    status: listingStatusSchema.optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'At least one field is required',
  })
  .refine(updateRentalPairOk, {
    message: 'Rental price and rental unit must be set together',
    path: ['rentalUnit'],
  })

export type ListingType = z.infer<typeof listingTypeSchema>
export type ListingStatus = z.infer<typeof listingStatusSchema>
export type RentalUnit = z.infer<typeof rentalUnitSchema>
export type ListListingsQuery = z.infer<typeof listListingsQuerySchema>
export type CreateListingBody = z.infer<typeof createListingBodySchema>
export type UpdateListingBody = z.infer<typeof updateListingBodySchema>
