import { EMPTY_LISTING_FORM } from '@/features/provider/listing.form'
import { listingFormSchema, listingWriteFromForm } from '@/features/provider/listing.schema'

describe('listingFormSchema', () => {
  it('accepts a name-only listing', () => {
    const result = listingFormSchema.safeParse({
      ...EMPTY_LISTING_FORM,
      name: 'Cement',
    })
    expect(result.success).toBe(true)
  })

  it('rejects an empty name', () => {
    const result = listingFormSchema.safeParse({
      ...EMPTY_LISTING_FORM,
      name: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a non-decimal price', () => {
    const result = listingFormSchema.safeParse({
      ...EMPTY_LISTING_FORM,
      name: 'Cement',
      price: '12.34567',
    })
    expect(result.success).toBe(false)
  })

  it('requires rental unit when for-rent has a rental price', () => {
    const result = listingFormSchema.safeParse({
      ...EMPTY_LISTING_FORM,
      name: 'Excavator',
      isForRent: true,
      rentalPrice: '100',
      rentalUnit: '',
    })
    expect(result.success).toBe(false)
  })
})

describe('listingWriteFromForm', () => {
  it('maps empty optional strings to null', () => {
    const result = listingWriteFromForm(
      {
        ...EMPTY_LISTING_FORM,
        name: 'Cement',
        currency: 'USD',
      },
      'provider-1',
    )
    expect(result).toEqual({
      data: expect.objectContaining({
        name: 'Cement',
        providerId: 'provider-1',
        currency: 'USD',
        price: null,
        categoryId: null,
        rentalPrice: null,
        rentalUnit: null,
      }),
    })
  })
})
