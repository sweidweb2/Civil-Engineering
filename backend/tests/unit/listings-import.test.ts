import { describe, expect, it } from 'vitest'

import {
  parseImportRow,
  resolveImportCategory,
} from '../../src/modules/listings/listings-import.js'

const categories = [
  {
    id: 'cat-1',
    name: 'Cement',
    nameAr: 'إسمنت',
    slug: 'cement',
    kind: 'MATERIAL' as const,
  },
  {
    id: 'cat-2',
    name: 'Heavy equipment',
    nameAr: null,
    slug: 'heavy-equipment',
    kind: 'EQUIPMENT' as const,
  },
]

describe('listings import helpers', () => {
  it('resolves category by slug, name, or Arabic name', () => {
    expect(resolveImportCategory('cement', categories)).toEqual({ id: 'cat-1' })
    expect(resolveImportCategory('Cement', categories)).toEqual({ id: 'cat-1' })
    expect(resolveImportCategory('إسمنت', categories)).toEqual({ id: 'cat-1' })
  })

  it('rejects unknown categories', () => {
    expect(resolveImportCategory('Widgets', categories)).toEqual({
      error: 'Unknown category "Widgets"',
    })
  })

  it('accepts a valid fixed-price row', () => {
    const result = parseImportRow(
      {
        name: 'Portland cement',
        category: 'cement',
        currency: 'usd',
        price: '7.5',
        status: 'ACTIVE',
      },
      'prv-1',
      categories,
    )
    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        providerId: 'prv-1',
        categoryId: 'cat-1',
        name: 'Portland cement',
        currency: 'USD',
        price: '7.5',
        priceMin: null,
        priceMax: null,
        status: 'ACTIVE',
      }),
    })
  })

  it('skips mixed pricing modes', () => {
    const result = parseImportRow(
      { name: 'Bad', price: '10', price_min: '1', price_max: '2' },
      'prv-1',
      categories,
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toMatch(/either price or price_min/)
    }
  })

  it('skips unknown rental units', () => {
    const result = parseImportRow(
      { name: 'Rental', rental_price: '20', rental_unit: 'YEAR' },
      'prv-1',
      categories,
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toMatch(/rental_unit/)
    }
  })

  it('requires name', () => {
    const result = parseImportRow({ name: '   ' }, 'prv-1', categories)
    expect(result).toEqual({ ok: false, reason: 'Name is required' })
  })
})
