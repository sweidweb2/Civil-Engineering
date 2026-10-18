import { z } from 'zod'

import { isRentalUnit, type ListingWriteInput, type RentalUnit } from '@/services/listings'

import { type ListingForm } from './listings.form'

const DECIMAL_PATTERN = /^\d{1,14}(\.\d{1,4})?$/

function optionalDecimal(label: string) {
  return z
    .string()
    .trim()
    .refine((value) => value.length === 0 || DECIMAL_PATTERN.test(value), {
      message: `${label} must be a decimal with up to 4 places`,
    })
}

export const listingFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(160, 'Name must be at most 160 characters'),
    type: z.enum(['MATERIAL', 'EQUIPMENT', 'SERVICE']),
    providerId: z.string().trim().min(1, 'Provider is required'),
    categoryId: z.string().trim().min(1, 'Category is required'),
    unit: z.string().trim().min(1, 'Unit is required').max(40, 'Unit must be at most 40 characters'),
    currency: z
      .string()
      .trim()
      .min(1, 'Currency is required')
      .length(3, 'Currency must be a 3-letter code'),
    price: z
      .string()
      .trim()
      .min(1, 'Price is required')
      .regex(DECIMAL_PATTERN, 'Price must be a decimal with up to 4 places'),
    status: z.enum(['ACTIVE', 'INACTIVE']),
    description: z.string().trim().max(4000, 'Description must be at most 4000 characters'),
    brand: z.string().trim().max(120, 'Brand must be at most 120 characters'),
    quantityAvailable: optionalDecimal('Quantity'),
    rentalPrice: optionalDecimal('Rental price'),
    rentalUnit: z.string(),
  })
  .superRefine((value, ctx) => {
    const hasPrice = value.rentalPrice.length > 0
    const hasUnit = value.rentalUnit.trim().length > 0
    if (hasPrice !== hasUnit) {
      ctx.addIssue({
        code: 'custom',
        message: 'Rental price and rental unit must be set together',
        path: ['rentalUnit'],
      })
    }
  })

function emptyToNull(value: string): string | null {
  return value.length > 0 ? value : null
}

export function listingWriteFromForm(form: ListingForm): { data: ListingWriteInput } | { error: string } {
  const parsed = listingFormSchema.safeParse(form)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the listing fields' }
  }
  const value = parsed.data
  const rentalUnit: RentalUnit | null =
    value.rentalUnit && isRentalUnit(value.rentalUnit) ? value.rentalUnit : null
  return {
    data: {
      name: value.name,
      type: value.type,
      providerId: value.providerId,
      categoryId: value.categoryId,
      unit: value.unit,
      currency: value.currency,
      price: value.price,
      status: value.status,
      description: emptyToNull(value.description),
      brand: emptyToNull(value.brand),
      quantityAvailable: emptyToNull(value.quantityAvailable),
      rentalPrice: emptyToNull(value.rentalPrice),
      rentalUnit,
    },
  }
}
