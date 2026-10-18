import type { AuthActor } from '../../authz/index.js'
import { isAdmin } from '../../authz/index.js'
import { forbidden, notFound, validationError } from '../../errors/app-error.js'
import type { ListingRecord, ListingsRepository } from './listings.repository.js'
import type { CreateListingBody, ListListingsQuery, ListingType, UpdateListingBody } from './listings.schema.js'
import type { Listing, ListingTypeCounts, PaginatedListings } from './listings.types.js'

export type ListingsService = {
  listListings: (query: ListListingsQuery, actor: AuthActor) => Promise<PaginatedListings>
  getListingById: (id: string, actor: AuthActor) => Promise<Listing>
  createListing: (input: CreateListingBody, actor: AuthActor) => Promise<Listing>
  updateListing: (id: string, input: UpdateListingBody, actor: AuthActor) => Promise<Listing>
  deleteListing: (id: string, actor: AuthActor) => Promise<DeleteListingResult>
}

export type DeleteListingResult = {
  outcome: 'deleted' | 'hidden'
}

export function toListingDto(record: ListingRecord): Listing {
  return {
    id: record.id,
    providerId: record.providerId,
    providerName: record.providerName,
    categoryId: record.categoryId,
    categoryName: record.categoryName,
    type: record.type,
    name: record.name,
    description: record.description,
    brand: record.brand,
    unit: record.unit,
    currency: record.currency,
    price: record.price,
    rentalPrice: record.rentalPrice,
    rentalUnit: record.rentalUnit,
    quantityAvailable: record.quantityAvailable,
    status: record.status,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

function assertAdmin(actor: AuthActor) {
  if (!isAdmin(actor.roles)) {
    throw forbidden('Only admins can manage listings')
  }
}

function assertCanView(actor: AuthActor) {
  if (isAdmin(actor.roles) || actor.roles.includes('MANAGER')) return
  throw forbidden('Only admins and project managers can view listings')
}

function assertRentalPair(price: string | number | null, unit: string | null) {
  const hasPrice = price != null && price !== ''
  const hasUnit = unit != null
  if (hasPrice !== hasUnit) {
    throw validationError('Rental price and rental unit must be set together')
  }
}

export function createListingsService(repository: ListingsRepository): ListingsService {
  async function loadOrThrow(id: string): Promise<ListingRecord> {
    const listing = await repository.findById(id)
    if (!listing) throw notFound('Listing not found', 'LISTING_NOT_FOUND')
    return listing
  }

  async function assertRefs(providerId: string, categoryId: string, type: ListingType) {
    const provider = await repository.findProvider(providerId)
    if (!provider) throw notFound('Provider not found', 'LISTING_PROVIDER_NOT_FOUND')
    const category = await repository.findCategory(categoryId)
    if (!category) throw notFound('Category not found', 'LISTING_CATEGORY_NOT_FOUND')
    if (category.scope !== 'PLATFORM' || !category.isActive) {
      throw validationError('Category must be an active platform category')
    }
    if (category.kind !== type) {
      throw validationError('Category kind must match the listing type')
    }
  }

  return {
    async listListings(query, actor) {
      assertCanView(actor)
      const emptyCounts: ListingTypeCounts = { MATERIAL: 0, EQUIPMENT: 0, SERVICE: 0 }
      const [{ items, total }, typeCounts] =
        query.counts === false
          ? [await repository.findMany(query), emptyCounts]
          : await Promise.all([repository.findMany(query), repository.countByType(query.providerId)])
      return {
        data: items.map(toListingDto),
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          typeCounts,
        },
      }
    },

    async getListingById(id, actor) {
      assertCanView(actor)
      return toListingDto(await loadOrThrow(id))
    },

    async createListing(input, actor) {
      assertAdmin(actor)
      assertRentalPair(input.rentalPrice ?? null, input.rentalUnit ?? null)
      await assertRefs(input.providerId, input.categoryId, input.type)
      const created = await repository.create({
        providerId: input.providerId,
        categoryId: input.categoryId,
        type: input.type,
        name: input.name,
        description: input.description ?? null,
        brand: input.brand ?? null,
        unit: input.unit,
        currency: input.currency.toUpperCase(),
        price: input.price,
        rentalPrice: input.rentalPrice ?? null,
        rentalUnit: input.rentalUnit ?? null,
        quantityAvailable: input.quantityAvailable ?? null,
        status: input.status ?? 'ACTIVE',
      })
      return toListingDto(created)
    },

    async updateListing(id, input, actor) {
      assertAdmin(actor)
      const listing = await loadOrThrow(id)
      const nextType = input.type ?? listing.type
      const nextProviderId = input.providerId ?? listing.providerId
      const nextCategoryId = input.categoryId ?? listing.categoryId
      const nextRentalPrice = input.rentalPrice === undefined ? listing.rentalPrice : input.rentalPrice
      const nextRentalUnit = input.rentalUnit === undefined ? listing.rentalUnit : input.rentalUnit
      assertRentalPair(nextRentalPrice, nextRentalUnit)
      if (input.providerId !== undefined || input.categoryId !== undefined || input.type !== undefined) {
        await assertRefs(nextProviderId, nextCategoryId, nextType)
      }
      const updated = await repository.update(id, {
        ...input,
        currency: input.currency?.toUpperCase(),
      })
      return toListingDto(updated)
    },

    async deleteListing(id, actor) {
      assertAdmin(actor)
      await loadOrThrow(id)
      const reviewCount = await repository.countListingReviews(id)
      if (reviewCount > 0) {
        await repository.hide(id)
        return { outcome: 'hidden' as const }
      }
      await repository.delete(id)
      return { outcome: 'deleted' as const }
    },
  }
}
