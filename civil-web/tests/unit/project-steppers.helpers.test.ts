import { describe, expect, it } from 'vitest'

import {
  fileIdFromValue,
  isFileSnapshot,
  listingIdFromValue,
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
    expect(listingIdFromValue(null)).toBeNull()
    expect(listingIdFromValue('')).toBeNull()
    expect(listingIdFromValue(' list-1 ')).toBe('list-1')
    expect(listingIdFromValue(listing())).toBe('list-1')
    expect(listingIdFromValue(12)).toBeNull()
  })

  it('extracts file ids only from file-shaped values', () => {
    expect(fileIdFromValue('file-1')).toBe('file-1')
    expect(
      fileIdFromValue({
        id: 'file-1',
        originalName: 'a.pdf',
        mime: 'application/pdf',
        size: 10,
      }),
    ).toBe('file-1')
    expect(fileIdFromValue(listing())).toBeNull()
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
