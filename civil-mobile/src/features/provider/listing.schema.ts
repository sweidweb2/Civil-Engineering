import type { TFunction } from 'i18next'
import { z } from 'zod'

import type { ListingWriteInput, RentalUnit } from '@/services/listings'

import type { ListingFormValues } from './listing.form'

const DECIMAL_PATTERN = /^\d{1,14}(\.\d{1,4})?$/

function isRentalUnit(value: string): value is RentalUnit {
  return value === 'HOUR' || value === 'DAY' || value === 'WEEK' || value === 'MONTH'
}

export function listingFormSchema(t: TFunction) {
  return z
    .object({
      name: z.string().trim().min(1, t('validation.nameRequired')).max(160),
      categoryId: z.string().trim(),
      unit: z.string().trim().max(40),
      currency: z
        .string()
        .trim()
        .refine((value) => value.length === 0 || value.length === 3, {
          message: t('validation.currencyCode'),
        }),
      isPriceRange: z.boolean(),
      price: z.string().trim(),
      priceMin: z.string().trim(),
      priceMax: z.string().trim(),
      status: z.enum(['ACTIVE', 'INACTIVE']),
      description: z.string().trim().max(4000),
      brand: z.string().trim().max(120),
      quantityAvailable: z
        .string()
        .trim()
        .refine((value) => value.length === 0 || DECIMAL_PATTERN.test(value), {
          message: t('validation.quantityNumber'),
        }),
      isForRent: z.boolean(),
      rentalPrice: z.string().trim(),
      rentalUnit: z.string(),
    })
    .superRefine((value, ctx) => {
      if (value.isPriceRange) {
        const hasMin = value.priceMin.length > 0
        const hasMax = value.priceMax.length > 0
        if (hasMin && !DECIMAL_PATTERN.test(value.priceMin)) {
          ctx.addIssue({
            code: 'custom',
            message: t('validation.minPriceNumber'),
            path: ['priceMin'],
          })
        } else if (hasMax && !DECIMAL_PATTERN.test(value.priceMax)) {
          ctx.addIssue({
            code: 'custom',
            message: t('validation.maxPriceNumber'),
            path: ['priceMax'],
          })
        } else if (hasMin !== hasMax) {
          ctx.addIssue({
            code: 'custom',
            message: t('validation.bothMinMax'),
            path: [hasMin ? 'priceMax' : 'priceMin'],
          })
        } else if (hasMin && Number(value.priceMin) > Number(value.priceMax)) {
          ctx.addIssue({
            code: 'custom',
            message: t('validation.minExceedsMax'),
            path: ['priceMax'],
          })
        }
      } else if (value.price.length > 0 && !DECIMAL_PATTERN.test(value.price)) {
        ctx.addIssue({ code: 'custom', message: t('validation.priceNumber'), path: ['price'] })
      }
      if (value.isForRent) {
        if (value.rentalPrice.length > 0 || value.rentalUnit.trim().length > 0) {
          if (!value.rentalPrice || !DECIMAL_PATTERN.test(value.rentalPrice)) {
            ctx.addIssue({
              code: 'custom',
              message: t('validation.rentalPriceNumber'),
              path: ['rentalPrice'],
            })
          }
          if (!isRentalUnit(value.rentalUnit)) {
            ctx.addIssue({
              code: 'custom',
              message: t('validation.pickRentalUnit'),
              path: ['rentalUnit'],
            })
          }
        }
      }
    })
}

function emptyToNull(value: string): string | null {
  return value.length > 0 ? value : null
}

export function listingWriteFromForm(
  form: ListingFormValues,
  t: TFunction,
  providerId?: string,
): { data: ListingWriteInput } | { error: string; field?: keyof ListingFormValues } {
  const parsed = listingFormSchema(t).safeParse(form)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return {
      error: issue?.message ?? t('validation.checkFormFields'),
      field: issue?.path[0] as keyof ListingFormValues | undefined,
    }
  }
  const value = parsed.data
  const rentalUnit: RentalUnit | null =
    value.isForRent && isRentalUnit(value.rentalUnit) ? value.rentalUnit : null

  return {
    data: {
      name: value.name,
      ...(providerId ? { providerId } : {}),
      categoryId: emptyToNull(value.categoryId),
      unit: emptyToNull(value.unit),
      currency: emptyToNull(value.currency),
      // Send all three so switching mode clears the other one server-side.
      price: value.isPriceRange ? null : emptyToNull(value.price),
      priceMin: value.isPriceRange ? emptyToNull(value.priceMin) : null,
      priceMax: value.isPriceRange ? emptyToNull(value.priceMax) : null,
      status: value.status,
      description: emptyToNull(value.description),
      brand: emptyToNull(value.brand),
      quantityAvailable: emptyToNull(value.quantityAvailable),
      rentalPrice: value.isForRent ? emptyToNull(value.rentalPrice) : null,
      rentalUnit,
    },
  }
}
