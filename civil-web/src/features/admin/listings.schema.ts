import { z } from 'zod'

import { isRentalUnit, type ListingWriteInput, type RentalUnit } from '@/services/listings'

import { type ListingForm } from './listings.form'

const DECIMAL_PATTERN = /^\d{1,14}(\.\d{1,4})?$/

function optionalDecimal(messageKey: string) {
  return z
    .string()
    .trim()
    .refine((value) => value.length === 0 || DECIMAL_PATTERN.test(value), {
      message: messageKey,
    })
}

export const listingFormSchema = z
  .object({
    name: z.string().trim().min(1, 'nameRequired').max(160, 'nameMax'),
    providerId: z.string().trim(),
    categoryId: z.string().trim(),
    unit: z.string().trim().max(40, 'unitMax'),
    currency: z
      .string()
      .trim()
      .refine((value) => value.length === 0 || value.length === 3, {
        message: 'currencyCode',
      }),
    hasPriceRange: z.boolean(),
    price: z.string().trim(),
    priceMin: z.string().trim(),
    priceMax: z.string().trim(),
    status: z.enum(['ACTIVE', 'INACTIVE']),
    description: z.string().trim().max(4000, 'descriptionMax'),
    brand: z.string().trim().max(120, 'brandMax'),
    quantityAvailable: optionalDecimal('quantityDecimal'),
    isForRent: z.boolean(),
    rentalPrice: z.string().trim(),
    rentalUnit: z.string(),
  })
  .superRefine((value, ctx) => {
    if (value.hasPriceRange) {
      const hasMin = value.priceMin.length > 0
      const hasMax = value.priceMax.length > 0
      if (hasMin || hasMax) {
        if (!DECIMAL_PATTERN.test(value.priceMin)) {
          ctx.addIssue({
            code: 'custom',
            message: 'minPriceDecimal',
            path: ['priceMin'],
          })
        }
        if (!DECIMAL_PATTERN.test(value.priceMax)) {
          ctx.addIssue({
            code: 'custom',
            message: 'maxPriceDecimal',
            path: ['priceMax'],
          })
        }
        if (
          DECIMAL_PATTERN.test(value.priceMin) &&
          DECIMAL_PATTERN.test(value.priceMax) &&
          Number(value.priceMin) > Number(value.priceMax)
        ) {
          ctx.addIssue({
            code: 'custom',
            message: 'minMaxOrder',
            path: ['priceMax'],
          })
        }
      }
    } else if (value.price.length > 0 && !DECIMAL_PATTERN.test(value.price)) {
      ctx.addIssue({
        code: 'custom',
        message: 'priceDecimal',
        path: ['price'],
      })
    }

    if (value.isForRent) {
      if (value.rentalPrice.length > 0 || value.rentalUnit.trim().length > 0) {
        if (!DECIMAL_PATTERN.test(value.rentalPrice) || value.rentalPrice.length === 0) {
          ctx.addIssue({
            code: 'custom',
            message: 'rentalPriceDecimal',
            path: ['rentalPrice'],
          })
        }
        if (!isRentalUnit(value.rentalUnit)) {
          ctx.addIssue({
            code: 'custom',
            message: 'rentalUnitRequired',
            path: ['rentalUnit'],
          })
        }
      }
    }
  })

function emptyToNull(value: string): string | null {
  return value.length > 0 ? value : null
}

export function listingWriteFromForm(
  form: ListingForm,
): { data: ListingWriteInput } | { error: string } {
  const parsed = listingFormSchema.safeParse(form)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'checkFields' }
  }
  const value = parsed.data
  const rentalUnit: RentalUnit | null =
    value.isForRent && value.rentalUnit && isRentalUnit(value.rentalUnit) ? value.rentalUnit : null
  const hasRangeValues =
    value.hasPriceRange && (value.priceMin.length > 0 || value.priceMax.length > 0)
  return {
    data: {
      name: value.name,
      providerId: emptyToNull(value.providerId),
      categoryId: emptyToNull(value.categoryId),
      unit: emptyToNull(value.unit),
      currency: emptyToNull(value.currency),
      price: hasRangeValues ? null : emptyToNull(value.price),
      priceMin: hasRangeValues ? emptyToNull(value.priceMin) : null,
      priceMax: hasRangeValues ? emptyToNull(value.priceMax) : null,
      status: value.status,
      description: emptyToNull(value.description),
      brand: emptyToNull(value.brand),
      quantityAvailable: emptyToNull(value.quantityAvailable),
      rentalPrice: value.isForRent ? emptyToNull(value.rentalPrice) : null,
      rentalUnit,
    },
  }
}
