import { describe, expect, it } from 'vitest'

import type { ListingSnapshot } from '../../src/modules/listings/listings.access.js'
import {
  assertListingMatchesCategory,
  assertValidStepperValue,
  fileIdFromValue,
  listingIdFromValue,
} from '../../src/modules/project-steppers/project-steppers.values.js'

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
    rentalPrice: null,
    rentalUnit: null,
    providerId: 'prov-1',
    status: 'ACTIVE',
    description: null,
    ...overrides,
  }
}

describe('project-steppers.values', () => {
  describe('listingIdFromValue', () => {
    it('reads id from string, snapshot, or null', () => {
      expect(listingIdFromValue(null)).toBeNull()
      expect(listingIdFromValue('')).toBeNull()
      expect(listingIdFromValue('  ')).toBeNull()
      expect(listingIdFromValue(' list-1 ')).toBe('list-1')
      expect(listingIdFromValue(listing())).toBe('list-1')
      expect(listingIdFromValue(42)).toBeNull()
      expect(listingIdFromValue(true)).toBeNull()
    })
  })

  describe('fileIdFromValue', () => {
    it('reads id from string or file snapshot only', () => {
      expect(fileIdFromValue(null)).toBeNull()
      expect(fileIdFromValue(' file-1 ')).toBe('file-1')
      expect(
        fileIdFromValue({
          id: 'file-1',
          originalName: 'a.pdf',
          mime: 'application/pdf',
          size: 10,
        }),
      ).toBe('file-1')
      // Listing snapshot has id but not originalName — not a FILE value.
      expect(fileIdFromValue(listing())).toBeNull()
    })
  })

  describe('assertValidStepperValue', () => {
    it('allows null for any type', () => {
      expect(() => assertValidStepperValue('TEXT', 'Notes', null)).not.toThrow()
      expect(() => assertValidStepperValue('NUMBER', 'Qty', null)).not.toThrow()
    })

    it('validates TEXT', () => {
      expect(() => assertValidStepperValue('TEXT', 'Notes', 'ok')).not.toThrow()
      expect(() => assertValidStepperValue('TEXT', 'Notes', 1)).toThrow(
        expect.objectContaining({ status: 400 }),
      )
      expect(() => assertValidStepperValue('TEXT', 'Notes', 'x'.repeat(2001))).toThrow(
        expect.objectContaining({ status: 400 }),
      )
    })

    it('validates NUMBER', () => {
      expect(() => assertValidStepperValue('NUMBER', 'Qty', 12.5)).not.toThrow()
      expect(() => assertValidStepperValue('NUMBER', 'Qty', Number.NaN)).toThrow(
        expect.objectContaining({ status: 400 }),
      )
      expect(() => assertValidStepperValue('NUMBER', 'Qty', 1e16)).toThrow(
        expect.objectContaining({ status: 400 }),
      )
      expect(() => assertValidStepperValue('NUMBER', 'Qty', '12')).toThrow(
        expect.objectContaining({ status: 400 }),
      )
    })

    it('validates YES_NO', () => {
      expect(() => assertValidStepperValue('YES_NO', 'Done', true)).not.toThrow()
      expect(() => assertValidStepperValue('YES_NO', 'Done', false)).not.toThrow()
      expect(() => assertValidStepperValue('YES_NO', 'Done', 'yes')).toThrow(
        expect.objectContaining({ status: 400 }),
      )
    })

    it('validates DATE', () => {
      expect(() => assertValidStepperValue('DATE', 'When', '2026-10-24')).not.toThrow()
      expect(() => assertValidStepperValue('DATE', 'When', '24-10-2026')).toThrow(
        expect.objectContaining({ status: 400 }),
      )
      expect(() => assertValidStepperValue('DATE', 'When', 20261024)).toThrow(
        expect.objectContaining({ status: 400 }),
      )
    })

    it('validates CATEGORY and FILE selections', () => {
      expect(() => assertValidStepperValue('CATEGORY', 'Product', 'list-1')).not.toThrow()
      expect(() => assertValidStepperValue('CATEGORY', 'Product', listing())).not.toThrow()
      expect(() => assertValidStepperValue('CATEGORY', 'Product', '  ')).toThrow(
        expect.objectContaining({ status: 400 }),
      )
      expect(() => assertValidStepperValue('FILE', 'Scan', 'file-1')).not.toThrow()
      expect(() =>
        assertValidStepperValue('FILE', 'Scan', {
          id: 'file-1',
          originalName: 'a.pdf',
          mime: 'application/pdf',
          size: 1,
        }),
      ).not.toThrow()
      expect(() => assertValidStepperValue('FILE', 'Scan', listing())).toThrow(
        expect.objectContaining({ status: 400 }),
      )
    })
  })

  describe('assertListingMatchesCategory', () => {
    it('requires binding, active status, and matching category', () => {
      expect(() => assertListingMatchesCategory('Product', listing(), null)).toThrow(
        expect.objectContaining({ status: 400 }),
      )
      expect(() =>
        assertListingMatchesCategory('Product', listing({ status: 'DRAFT' }), 'cat-1'),
      ).toThrow(expect.objectContaining({ status: 400 }))
      expect(() =>
        assertListingMatchesCategory('Product', listing({ categoryId: 'other' }), 'cat-1'),
      ).toThrow(expect.objectContaining({ status: 400 }))
      expect(() => assertListingMatchesCategory('Product', listing(), 'cat-1')).not.toThrow()
    })
  })
})
