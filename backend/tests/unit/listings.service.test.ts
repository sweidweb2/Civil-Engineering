import { describe, expect, it, vi } from 'vitest'

import { AppError } from '../../src/errors/app-error.js'
import type {
  ListingRecord,
  ListingsRepository,
} from '../../src/modules/listings/listings.repository.js'
import {
  createListingBodySchema,
  updateListingBodySchema,
} from '../../src/modules/listings/listings.schema.js'
import { createListingsService } from '../../src/modules/listings/listings.service.js'

const admin = { id: 'admin-1', roles: ['ADMIN'] }
const manager = { id: 'pm-1', roles: ['MANAGER'] }
const client = { id: 'user-1', roles: ['CLIENT'] }

function record(overrides: Partial<ListingRecord> = {}): ListingRecord {
  return {
    id: 'lst-1',
    providerId: 'prv-1',
    providerName: 'Cedar Supplies',
    categoryId: 'cat-1',
    categoryName: 'Cement',
    categoryNameAr: null,
    categoryKind: 'MATERIAL',
    type: 'MATERIAL',
    name: 'Portland cement',
    description: null,
    brand: null,
    unit: 'bag',
    currency: 'USD',
    price: '7.4',
    priceMin: null,
    priceMax: null,
    rentalPrice: null,
    rentalUnit: null,
    quantityAvailable: null,
    status: 'ACTIVE',
    createdAt: new Date('2026-10-01T00:00:00.000Z'),
    updatedAt: new Date('2026-10-01T00:00:00.000Z'),
    mainImageStoragePath: null,
    ...overrides,
  }
}

function setup(opts?: {
  listing?: ListingRecord | null
  categoryKind?: ListingRecord['categoryKind']
}) {
  const listing = opts?.listing === undefined ? record() : opts.listing
  const repository: ListingsRepository = {
    findMany: vi.fn(async () => ({ items: listing ? [listing] : [], total: listing ? 1 : 0 })),
    countByType: vi.fn(async () => ({ MATERIAL: listing ? 1 : 0, EQUIPMENT: 0, SERVICE: 0 })),
    countByStatus: vi.fn(async () => ({ ACTIVE: listing ? 1 : 0, INACTIVE: 0 })),
    findById: vi.fn(async () => listing),
    findSnapshotById: vi.fn(async () => null),
    findSnapshotsByIds: vi.fn(async () => []),
    findNamesByIds: vi.fn(async () => []),
    existsById: vi.fn(async () => listing != null),
    listChoices: vi.fn(async () => []),
    findProvider: vi.fn(async () => ({ id: 'prv-1' })),
    findCategory: vi.fn(async () => ({
      id: 'cat-1',
      kind: opts?.categoryKind ?? 'MATERIAL',
      scope: 'PLATFORM' as const,
      isActive: true,
    })),
    findListingCategoriesForImport: vi.fn(async () => [
      {
        id: 'cat-1',
        name: 'Cement',
        nameAr: null,
        slug: 'cement',
        kind: 'MATERIAL' as const,
      },
    ]),
    findPriceFieldsByProviderId: vi.fn(async () =>
      listing
        ? [
            {
              id: listing.id,
              price: listing.price,
              priceMin: listing.priceMin,
              priceMax: listing.priceMax,
              rentalPrice: listing.rentalPrice,
            },
          ]
        : [],
    ),
    updatePrices: vi.fn(async () => undefined),
    createMany: vi.fn(async (inputs) => inputs.length),
    create: vi.fn(async (input) =>
      record({
        name: input.name,
        price: input.price == null ? null : String(input.price),
        priceMin: input.priceMin == null ? null : String(input.priceMin),
        priceMax: input.priceMax == null ? null : String(input.priceMax),
        currency: input.currency,
        rentalPrice: input.rentalPrice == null ? null : String(input.rentalPrice),
        rentalUnit: input.rentalUnit,
      }),
    ),
    update: vi.fn(async () => record()),
    countListingReviews: vi.fn(async () => 0),
    hide: vi.fn(async () => record({ status: 'INACTIVE' })),
    delete: vi.fn(async () => undefined),
  }
  const providers = {
    findProviderIdByOwnerUserId: vi.fn(async () => 'prv-1' as string | null),
    findOwnerUserId: vi.fn(async () => 'owner-1' as string | null),
  }
  return { repository, providers, service: createListingsService(repository, { providers }) }
}

const createInput = {
  providerId: 'prv-1',
  categoryId: 'cat-1',
  name: 'Portland cement',
  unit: 'bag',
  currency: 'usd',
  price: '7.4',
}

const nameOnlyInput = {
  name: 'Draft listing',
}

describe('listingsService', () => {
  it('forbids clients from listing records', async () => {
    const { service } = setup()
    await expect(service.listListings({ page: 2, limit: 8 }, client)).rejects.toMatchObject({
      status: 403,
    })
  })

  it('returns the requested page and limit for managers', async () => {
    const { service } = setup()
    const result = await service.listListings({ page: 2, limit: 8 }, manager)
    expect(result.meta).toMatchObject({ page: 2, limit: 8, total: 1 })
    expect(result.data).toHaveLength(1)
  })

  it('scopes the list and type counts to one provider', async () => {
    const { service, repository } = setup()
    await service.listListings({ page: 1, limit: 8, providerId: 'prv-1' }, admin)
    expect(repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ providerId: 'prv-1' }),
    )
    expect(repository.countByType).toHaveBeenCalledWith('prv-1')
    expect(repository.countByStatus).toHaveBeenCalledWith('prv-1')
  })

  it('always returns statusCounts and skips typeCounts when counts=false', async () => {
    const { service, repository } = setup()
    const result = await service.listListings({ page: 1, limit: 8, counts: false }, admin)
    expect(repository.countByType).not.toHaveBeenCalled()
    expect(repository.countByStatus).toHaveBeenCalledTimes(1)
    expect(result.meta.statusCounts).toEqual({ ACTIVE: 1, INACTIVE: 0 })
    expect(result.meta.typeCounts).toEqual({ MATERIAL: 0, EQUIPMENT: 0, SERVICE: 0 })
  })

  it('creates a listing and stores currency in uppercase', async () => {
    const { service, repository } = setup()
    const created = await service.createListing(createInput, admin)
    expect(created.name).toBe('Portland cement')
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        currency: 'USD',
        price: '7.4',
        priceMin: null,
        priceMax: null,
        status: 'ACTIVE',
      }),
    )
  })

  it('creates a name-only listing', async () => {
    const { service, repository } = setup()
    await service.createListing(nameOnlyInput, admin)
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Draft listing',
        providerId: null,
        categoryId: null,
        unit: null,
        currency: null,
        price: null,
        priceMin: null,
        priceMax: null,
      }),
    )
  })

  it('creates a listing with a price range', async () => {
    const { service, repository } = setup()
    await service.createListing(
      { ...createInput, price: null, priceMin: '10', priceMax: '20' },
      admin,
    )
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ price: null, priceMin: '10', priceMax: '20' }),
    )
  })

  it('rejects a worker category for listings', async () => {
    const { service } = setup({ categoryKind: 'WORKER' })
    await expect(service.createListing(createInput, admin)).rejects.toMatchObject({ status: 400 })
  })

  it('rejects a rental price without a rental unit', async () => {
    const { service } = setup()
    await expect(
      service.createListing({ ...createInput, rentalPrice: '12' }, admin),
    ).rejects.toBeInstanceOf(AppError)
  })

  it('rejects an inactive or provider-scoped category', async () => {
    const { service, repository } = setup()
    vi.mocked(repository.findCategory).mockResolvedValue({
      id: 'cat-1',
      kind: 'MATERIAL',
      scope: 'PLATFORM',
      isActive: false,
    })
    await expect(service.createListing(createInput, admin)).rejects.toMatchObject({ status: 400 })

    vi.mocked(repository.findCategory).mockResolvedValue({
      id: 'cat-1',
      kind: 'MATERIAL',
      scope: 'PROVIDER',
      isActive: true,
    })
    await expect(service.createListing(createInput, admin)).rejects.toMatchObject({ status: 400 })
  })

  it('forbids managers from deleting listings', async () => {
    const { service } = setup()
    await expect(service.deleteListing('lst-1', manager)).rejects.toMatchObject({ status: 403 })
  })

  it('deletes a listing that has no reviews', async () => {
    const { service, repository } = setup()
    await expect(service.deleteListing('lst-1', admin)).resolves.toEqual({ outcome: 'deleted' })
    expect(repository.delete).toHaveBeenCalledWith('lst-1')
    expect(repository.hide).not.toHaveBeenCalled()
  })

  it('hides a listing that reviews still reference', async () => {
    const { service, repository } = setup()
    vi.mocked(repository.countListingReviews).mockResolvedValue(2)
    await expect(service.deleteListing('lst-1', admin)).resolves.toEqual({ outcome: 'hidden' })
    expect(repository.hide).toHaveBeenCalledWith('lst-1')
    expect(repository.delete).not.toHaveBeenCalled()
  })

  it('bulk-increases prices by percentage for a provider', async () => {
    const { service, repository } = setup({
      listing: record({ price: '100', rentalPrice: '50' }),
    })
    await expect(
      service.bulkAdjustPrices(
        { providerId: 'prv-1', direction: 'increase', mode: 'percentage', value: '10' },
        admin,
      ),
    ).resolves.toEqual({ updated: 1, skipped: 0 })
    expect(repository.updatePrices).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'lst-1',
        price: '110.0000',
        rentalPrice: '55.0000',
      }),
    ])
  })

  it('requires providerId for admin bulk price adjust', async () => {
    const { service } = setup()
    await expect(
      service.bulkAdjustPrices({ direction: 'increase', mode: 'amount', value: '5' }, admin),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('imports valid CSV rows and reports skipped invalid ones', async () => {
    const { service, repository } = setup()
    const result = await service.importListings(
      {
        providerId: 'prv-1',
        rows: [
          { name: 'Good listing', category: 'Cement', price: '9' },
          { name: '', price: '1' },
          { name: 'Unknown cat', category: 'Nope' },
        ],
      },
      admin,
    )
    expect(result.created).toBe(1)
    expect(result.skipped).toBe(2)
    expect(result.errors).toHaveLength(2)
    expect(repository.createMany).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'Good listing', categoryId: 'cat-1', price: '9' }),
    ])
  })
})

describe('listing body schemas', () => {
  it('rejects a currency that is not 3 characters', () => {
    const parsed = createListingBodySchema.safeParse({ ...createInput, currency: 'US' })
    expect(parsed.success).toBe(false)
  })

  it('rejects an update that sets rental price without a rental unit', () => {
    const parsed = updateListingBodySchema.safeParse({ rentalPrice: '12' })
    expect(parsed.success).toBe(false)
  })

  it('accepts an update that sets the rental pair together', () => {
    const parsed = updateListingBodySchema.safeParse({ rentalPrice: '12', rentalUnit: 'DAY' })
    expect(parsed.success).toBe(true)
  })

  it('accepts an update that leaves the rental pair unchanged', () => {
    const parsed = updateListingBodySchema.safeParse({ name: 'Cement' })
    expect(parsed.success).toBe(true)
  })

  it('rejects fixed price mixed with a range', () => {
    const parsed = createListingBodySchema.safeParse({
      ...createInput,
      priceMin: '1',
      priceMax: '2',
    })
    expect(parsed.success).toBe(false)
  })
})
