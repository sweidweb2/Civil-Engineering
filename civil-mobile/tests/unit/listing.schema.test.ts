import { EMPTY_LISTING_FORM, formFromListing } from '@/features/provider/listing.form'
import { listingFormSchema, listingWriteFromForm } from '@/features/provider/listing.schema'
import type { Listing } from '@/services/listings'

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

describe('listing price range', () => {
  const base = { ...EMPTY_LISTING_FORM, name: 'Sand', isPriceRange: true }

  it('sends min/max and clears the fixed price', () => {
    const result = listingWriteFromForm({ ...base, price: '9', priceMin: '10', priceMax: '20' })
    expect('data' in result && result.data).toMatchObject({
      price: null,
      priceMin: '10',
      priceMax: '20',
    })
  })

  it('requires both bounds', () => {
    expect(listingWriteFromForm({ ...base, priceMin: '10' })).toMatchObject({ field: 'priceMax' })
  })

  it('rejects min above max', () => {
    expect(listingWriteFromForm({ ...base, priceMin: '30', priceMax: '20' })).toMatchObject({
      field: 'priceMax',
    })
  })

  it('round-trips a range listing without collapsing it to a fixed price', () => {
    const form = formFromListing({
      price: null,
      priceMin: '10',
      priceMax: '20',
    } as unknown as Listing)
    expect(form).toMatchObject({ isPriceRange: true, price: '', priceMin: '10', priceMax: '20' })
  })
})
