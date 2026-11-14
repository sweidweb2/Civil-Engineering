import { describe, expect, it } from 'vitest'

import { EMPTY_LISTING_FORM } from '@/features/listings/listings.form'
import { listingWriteFromForm } from '@/features/listings/listings.schema'

const valid = {
  ...EMPTY_LISTING_FORM,
  name: 'Cement',
  providerId: 'provider-1',
  categoryId: 'category-1',
  unit: 'ton',
  currency: 'USD',
  price: '42.50',
}

describe('listingWriteFromForm', () => {
  it('accepts a name-only listing', () => {
    const result = listingWriteFromForm({ ...EMPTY_LISTING_FORM, name: 'Cement' })
    expect(result).toEqual({
      data: {
        name: 'Cement',
        providerId: null,
        categoryId: null,
        unit: null,
        currency: 'USD',
        price: null,
        priceMin: null,
        priceMax: null,
        status: 'ACTIVE',
        description: null,
        brand: null,
        quantityAvailable: null,
        rentalPrice: null,
        rentalUnit: null,
      },
    })
  })

  it('accepts a complete listing and clears blank optional amounts', () => {
    const result = listingWriteFromForm(valid)
    expect(result).toEqual({
      data: {
        name: 'Cement',
        providerId: 'provider-1',
        categoryId: 'category-1',
        unit: 'ton',
        currency: 'USD',
        price: '42.50',
        priceMin: null,
        priceMax: null,
        status: 'ACTIVE',
        description: null,
        brand: null,
        quantityAvailable: null,
        rentalPrice: null,
        rentalUnit: null,
      },
    })
  })

  it('accepts a price range when the range toggle is on', () => {
    const result = listingWriteFromForm({
      ...valid,
      hasPriceRange: true,
      price: '',
      priceMin: '40',
      priceMax: '55',
    })
    expect(result).toEqual({
      data: {
        name: 'Cement',
        providerId: 'provider-1',
        categoryId: 'category-1',
        unit: 'ton',
        currency: 'USD',
        price: null,
        priceMin: '40',
        priceMax: '55',
        status: 'ACTIVE',
        description: null,
        brand: null,
        quantityAvailable: null,
        rentalPrice: null,
        rentalUnit: null,
      },
    })
  })

  it('rejects rental without a unit when for-rent has a price', () => {
    const result = listingWriteFromForm({ ...valid, isForRent: true, rentalPrice: '10' })
    expect(result).toEqual({ error: 'rentalUnitRequired' })
  })

  it('rejects a price that is not a decimal', () => {
    const result = listingWriteFromForm({ ...valid, price: '12.34567' })
    expect(result).toEqual({ error: 'priceDecimal' })
  })
})
