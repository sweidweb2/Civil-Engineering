import { describe, expect, it } from 'vitest'

import { EMPTY_LISTING_FORM } from '@/features/admin/listings.form'
import { listingWriteFromForm } from '@/features/admin/listings.schema'

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
  it('accepts a complete listing and clears blank optional amounts', () => {
    const result = listingWriteFromForm(valid)
    expect(result).toEqual({
      data: {
        name: 'Cement',
        type: 'MATERIAL',
        providerId: 'provider-1',
        categoryId: 'category-1',
        unit: 'ton',
        currency: 'USD',
        price: '42.50',
        status: 'ACTIVE',
        description: null,
        brand: null,
        quantityAvailable: null,
        rentalPrice: null,
        rentalUnit: null,
      },
    })
  })

  it('rejects a rental price without a rental unit', () => {
    const result = listingWriteFromForm({ ...valid, rentalPrice: '10' })
    expect(result).toEqual({ error: 'Rental price and rental unit must be set together' })
  })

  it('rejects a price that is not a decimal', () => {
    const result = listingWriteFromForm({ ...valid, price: '12.34567' })
    expect(result).toEqual({ error: 'Price must be a decimal with up to 4 places' })
  })
})
