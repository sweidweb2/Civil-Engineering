import type { AuthActor } from '../../authz/index.js'
import { isAdmin } from '../../authz/index.js'
import { forbidden, notFound, validationError } from '../../errors/app-error.js'
import {
  findProviderIdByOwnerUserId,
  findProviderOwnerUserId,
} from '../providers/providers.access.js'
import type { ListingRecord, ListingsRepository } from './listings.repository.js'
import type { CreateListingBody, ListingType, ListListingsQuery, UpdateListingBody } from './listings.schema.js'
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

function assertCanView(actor: AuthActor) {
  if (isAdmin(actor.roles) || actor.roles.includes('MANAGER') || actor.roles.includes('PROVIDER')) {
    return
  }
  throw forbidden('Only admins, project managers, and providers can view listings')
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

  async function resolveOwnedProviderId(actor: AuthActor): Promise<string> {
    const providerId = await findProviderIdByOwnerUserId(actor.id)
    if (!providerId) {
      throw notFound('Provider profile not found', 'PROVIDER_NOT_FOUND')
    }
    return providerId
  }

  async function assertCanManageListingProvider(actor: AuthActor, providerId: string) {
    if (isAdmin(actor.roles)) return
    if (!actor.roles.includes('PROVIDER')) {
      throw forbidden('Only admins and providers can manage listings')
    }
    const ownerUserId = await findProviderOwnerUserId(providerId)
    if (!ownerUserId || ownerUserId !== actor.id) {
      throw forbidden('You can only manage listings for your own provider')
    }
  }

  return {
    async listListings(query, actor) {
      assertCanView(actor)
      const scopedQuery =
        actor.roles.includes('PROVIDER') && !isAdmin(actor.roles)
          ? { ...query, providerId: await resolveOwnedProviderId(actor) }
          : query
      const emptyCounts: ListingTypeCounts = { MATERIAL: 0, EQUIPMENT: 0, SERVICE: 0 }
      const [{ items, total }, typeCounts] =
        scopedQuery.counts === false
          ? [await repository.findMany(scopedQuery), emptyCounts]
          : await Promise.all([
              repository.findMany(scopedQuery),
              repository.countByType(scopedQuery.providerId),
            ])
      return {
        data: items.map(toListingDto),
        meta: {
          page: scopedQuery.page,
          limit: scopedQuery.limit,
          total,
          typeCounts,
        },
      }
    },

    async getListingById(id, actor) {
      assertCanView(actor)
      const listing = await loadOrThrow(id)
      if (actor.roles.includes('PROVIDER') && !isAdmin(actor.roles)) {
        await assertCanManageListingProvider(actor, listing.providerId)
      }
      return toListingDto(listing)
    },

    async createListing(input, actor) {
      const providerId =
        actor.roles.includes('PROVIDER') && !isAdmin(actor.roles)
          ? await resolveOwnedProviderId(actor)
          : input.providerId
      if (isAdmin(actor.roles)) {
        // admins may choose any provider
      } else if (actor.roles.includes('PROVIDER')) {
        if (input.providerId && input.providerId !== providerId) {
          throw forbidden('You can only create listings for your own provider')
        }
      } else {
        throw forbidden('Only admins and providers can manage listings')
      }

      assertRentalPair(input.rentalPrice ?? null, input.rentalUnit ?? null)
      await assertRefs(providerId, input.categoryId, input.type)
      const created = await repository.create({
        providerId,
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
      const listing = await loadOrThrow(id)
      await assertCanManageListingProvider(actor, listing.providerId)

      const nextType = input.type ?? listing.type
      let nextProviderId = input.providerId ?? listing.providerId
      if (actor.roles.includes('PROVIDER') && !isAdmin(actor.roles)) {
        // Providers cannot reassign listings to another provider.
        nextProviderId = listing.providerId
        if (input.providerId !== undefined && input.providerId !== listing.providerId) {
          throw forbidden('You cannot move a listing to another provider')
        }
      }
      const nextCategoryId = input.categoryId ?? listing.categoryId
      const nextRentalPrice = input.rentalPrice === undefined ? listing.rentalPrice : input.rentalPrice
      const nextRentalUnit = input.rentalUnit === undefined ? listing.rentalUnit : input.rentalUnit
      assertRentalPair(nextRentalPrice, nextRentalUnit)
      if (input.providerId !== undefined || input.categoryId !== undefined || input.type !== undefined) {
        await assertRefs(nextProviderId, nextCategoryId, nextType)
      }
      const updated = await repository.update(id, {
        ...input,
        providerId: nextProviderId,
        currency: input.currency?.toUpperCase(),
      })
      return toListingDto(updated)
    },

    async deleteListing(id, actor) {
      const listing = await loadOrThrow(id)
      await assertCanManageListingProvider(actor, listing.providerId)
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
