import { describe, expect, it } from 'vitest'

import {
  fileIdFromStepperValue,
  isFileSnapshot,
  listingIdFromStepperValue,
  type ListingSnapshot,
} from '@/services/project-steppers'

function listing(overrides: Partial<ListingSnapshot> = {}): ListingSnapshot {
  return {
    id: 'list-1',
    name: 'Cement',
    type: 'MATERIAL',
    categoryId: 'cat-1',
    brand: null,
    unit: 'bag',
    currency: 'USD',
    price: '10',
    priceMin: null,
    priceMax: null,
    rentalPrice: null,
    rentalUnit: null,
    providerId: 'prov-1',
    status: 'ACTIVE',
    description: null,
    ...overrides,
  }
}

describe('project-steppers client helpers', () => {
  it('extracts listing ids from write and snapshot values', () => {
    expect(listingIdFromStepperValue(null)).toBeNull()
    expect(listingIdFromStepperValue('')).toBeNull()
    expect(listingIdFromStepperValue(' list-1 ')).toBe('list-1')
    expect(listingIdFromStepperValue(listing())).toBe('list-1')
    expect(listingIdFromStepperValue(12)).toBeNull()
  })

  it('extracts file ids only from file-shaped values', () => {
    expect(fileIdFromStepperValue('file-1')).toBe('file-1')
    expect(
      fileIdFromStepperValue({
        id: 'file-1',
        originalName: 'a.pdf',
        mime: 'application/pdf',
        size: 10,
      }),
    ).toBe('file-1')
    expect(fileIdFromStepperValue(listing())).toBeNull()
    expect(isFileSnapshot(listing())).toBe(false)
    expect(
      isFileSnapshot({
        id: 'file-1',
        originalName: 'a.pdf',
        mime: 'application/pdf',
        size: 10,
      }),
    ).toBe(true)
  })
})
