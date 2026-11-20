import type { AuthActor } from '../../authz/index.js'
import { isAdmin } from '../../authz/index.js'
import type { AppConfig } from '../../config/index.js'
import { forbidden, notFound, validationError } from '../../errors/app-error.js'
import { resolvePublicOrPresignedUrl, type StorageService } from '../../storage/index.js'
import { auditActivity } from '../logging/index.js'
import type { ProvidersService } from '../providers/index.js'
import type {
  CreateListingRecordInput,
  ListingRecord,
  ListingsRepository,
} from './listings.repository.js'
import type {
  BulkPriceAdjustBody,
  CreateListingBody,
  ImportListingsBody,
  ListListingsQuery,
  UpdateListingBody,
} from './listings.schema.js'
import type {
  Listing,
  ListingSnapshot,
  ListingStatusCounts,
  ListingTypeCounts,
  PaginatedListings,
} from './listings.types.js'
import { parseImportRow } from './listings-import.js'

export type ListingsService = {
  listListings: (query: ListListingsQuery, actor: AuthActor) => Promise<PaginatedListings>
  getListingById: (id: string, actor: AuthActor) => Promise<Listing>
  createListing: (input: CreateListingBody, actor: AuthActor) => Promise<Listing>
  updateListing: (id: string, input: UpdateListingBody, actor: AuthActor) => Promise<Listing>
  deleteListing: (id: string, actor: AuthActor) => Promise<DeleteListingResult>
  bulkAdjustPrices: (input: BulkPriceAdjustBody, actor: AuthActor) => Promise<BulkPriceAdjustResult>
  importListings: (input: ImportListingsBody, actor: AuthActor) => Promise<ImportListingsResult>
  assertAccessible: (id: string, actor: AuthActor) => Promise<Listing>
  assertManageable: (id: string, actor: AuthActor) => Promise<Listing>
  /** Internal lookups for other modules (no actor / authorization). */
  getListingSnapshot: (id: string) => Promise<ListingSnapshot | null>
  getListingSnapshots: (ids: string[]) => Promise<ListingSnapshot[]>
  getListingNames: (ids: string[]) => Promise<Array<{ id: string; name: string }>>
  listingExists: (id: string) => Promise<boolean>
  countListingsByStatus: (providerId?: string) => Promise<ListingStatusCounts>
  listListingChoices: (filters?: {
    take?: number
    categoryId?: string
    status?: 'ACTIVE' | 'INACTIVE'
    q?: string
  }) => Promise<Array<{ id: string; name: string; subtitle: string }>>
}

export type DeleteListingResult = {
  outcome: 'deleted' | 'hidden'
}

export type BulkPriceAdjustResult = {
  updated: number
  skipped: number
}

export type ImportListingsResult = {
  created: number
  skipped: number
  errors: Array<{ row: number; reason: string }>
}

export type ListingsServiceDeps = {
  providers: Pick<ProvidersService, 'findProviderIdByOwnerUserId' | 'findOwnerUserId'>
  config?: AppConfig
  storage?: StorageService
}

export function toListingDto(record: ListingRecord, mainImageUrl: string | null = null): Listing {
  return {
    id: record.id,
    providerId: record.providerId,
    providerName: record.providerName,
    categoryId: record.categoryId,
    categoryName: record.categoryName,
    categoryNameAr: record.categoryNameAr,
    type: record.type,
    name: record.name,
    description: record.description,
    brand: record.brand,
    unit: record.unit,
    currency: record.currency,
    price: record.price,
    priceMin: record.priceMin,
    priceMax: record.priceMax,
    rentalPrice: record.rentalPrice,
    rentalUnit: record.rentalUnit,
    quantityAvailable: record.quantityAvailable,
    status: record.status,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    mainImageUrl,
    mainImageKey: mainImageUrl ? record.mainImageStoragePath : null,
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

function assertPricingMode(price: string | null, priceMin: string | null, priceMax: string | null) {
  const hasPrice = price != null && price !== ''
  const hasMin = priceMin != null && priceMin !== ''
  const hasMax = priceMax != null && priceMax !== ''
  if (!hasPrice && !hasMin && !hasMax) return
  if (hasPrice) {
    if (hasMin || hasMax) {
      throw validationError('Use either a fixed price or a min/max range, not both')
    }
    return
  }
  if (hasMin && hasMax) {
    if (Number(priceMin) > Number(priceMax)) {
      throw validationError('Min price must be less than or equal to max price')
    }
    return
  }
  throw validationError('Provide a fixed price, or both min and max prices')
}

function normalizePricing(input: {
  price?: string | null
  priceMin?: string | null
  priceMax?: string | null
}): { price: string | null; priceMin: string | null; priceMax: string | null } {
  const hasPrice = input.price != null && input.price !== ''
  if (hasPrice) {
    return { price: input.price ?? null, priceMin: null, priceMax: null }
  }
  return {
    price: null,
    priceMin: input.priceMin ?? null,
    priceMax: input.priceMax ?? null,
  }
}

export function createListingsService(
  repository: ListingsRepository,
  deps: ListingsServiceDeps,
): ListingsService {
  const { config, storage, providers } = deps

  async function loadOrThrow(id: string): Promise<ListingRecord> {
    const listing = await repository.findById(id)
    if (!listing) throw notFound('Listing not found', 'LISTING_NOT_FOUND')
    return listing
  }

  async function assertRefs(providerId: string | null, categoryId: string | null) {
    const [provider, category] = await Promise.all([
      providerId ? repository.findProvider(providerId) : Promise.resolve(null),
      categoryId ? repository.findCategory(categoryId) : Promise.resolve(null),
    ])
    if (providerId && !provider) {
      throw notFound('Provider not found', 'LISTING_PROVIDER_NOT_FOUND')
    }
    if (categoryId) {
      if (!category) throw notFound('Category not found', 'LISTING_CATEGORY_NOT_FOUND')
      if (category.scope !== 'PLATFORM' || !category.isActive) {
        throw validationError('Category must be an active platform category')
      }
      if (
        category.kind !== 'MATERIAL' &&
        category.kind !== 'EQUIPMENT' &&
        category.kind !== 'SERVICE'
      ) {
        throw validationError('Category kind must be MATERIAL, EQUIPMENT, or SERVICE')
      }
    }
  }

  async function resolveOwnedProviderId(actor: AuthActor): Promise<string> {
    const providerId = await providers.findProviderIdByOwnerUserId(actor.id)
    if (!providerId) {
      throw notFound('Provider profile not found', 'PROVIDER_NOT_FOUND')
    }
    return providerId
  }

  async function assertCanManageListingProvider(actor: AuthActor, providerId: string | null) {
    if (isAdmin(actor.roles)) return
    if (!actor.roles.includes('PROVIDER')) {
      throw forbidden('Only admins and providers can manage listings')
    }
    if (!providerId) {
      throw forbidden('You can only manage listings for your own provider')
    }
    const ownerUserId = await providers.findOwnerUserId(providerId)
    if (!ownerUserId || ownerUserId !== actor.id) {
      throw forbidden('You can only manage listings for your own provider')
    }
  }

  async function resolveMainImageUrl(storagePath: string | null): Promise<string | null> {
    if (!storagePath || !storage || !config) return null
    try {
      return await resolvePublicOrPresignedUrl({ config, storage, storagePath })
    } catch {
      return null
    }
  }

  async function presentListing(record: ListingRecord): Promise<Listing> {
    return toListingDto(record, await resolveMainImageUrl(record.mainImageStoragePath))
  }

  async function assertAccessible(id: string, actor: AuthActor): Promise<Listing> {
    assertCanView(actor)
    const listing = await loadOrThrow(id)
    if (actor.roles.includes('PROVIDER') && !isAdmin(actor.roles)) {
      await assertCanManageListingProvider(actor, listing.providerId)
    }
    return presentListing(listing)
  }

  async function assertManageable(id: string, actor: AuthActor): Promise<Listing> {
    const listing = await loadOrThrow(id)
    await assertCanManageListingProvider(actor, listing.providerId)
    return presentListing(listing)
  }

  return {
    assertAccessible,
    assertManageable,

    getListingSnapshot: (id) => repository.findSnapshotById(id),
    getListingSnapshots: (ids) => repository.findSnapshotsByIds(ids),
    getListingNames: (ids) => repository.findNamesByIds(ids),
    listingExists: (id) => repository.existsById(id),
    countListingsByStatus: (providerId) => repository.countByStatus(providerId),
    listListingChoices: (filters = {}) =>
      repository.listChoices({
        take: filters.take ?? 100,
        categoryId: filters.categoryId,
        status: filters.status,
        q: filters.q,
      }),

    async listListings(query, actor) {
      assertCanView(actor)
      const scopedQuery =
        actor.roles.includes('PROVIDER') && !isAdmin(actor.roles)
          ? { ...query, providerId: await resolveOwnedProviderId(actor) }
          : query
      const emptyCounts: ListingTypeCounts = { MATERIAL: 0, EQUIPMENT: 0, SERVICE: 0 }
      const [{ items, total }, statusCounts, typeCounts] = await Promise.all([
        repository.findMany(scopedQuery),
        repository.countByStatus(scopedQuery.providerId),
        scopedQuery.counts === false
          ? Promise.resolve(emptyCounts)
          : repository.countByType(scopedQuery.providerId),
      ])

      const uniquePaths = [
        ...new Set(
          items
            .map((row) => row.mainImageStoragePath)
            .filter((path): path is string => Boolean(path)),
        ),
      ]
      const urlByPath = new Map<string, string | null>()
      await Promise.all(
        uniquePaths.map(async (path) => {
          urlByPath.set(path, await resolveMainImageUrl(path))
        }),
      )

      return {
        data: items.map((item) =>
          toListingDto(
            item,
            item.mainImageStoragePath ? (urlByPath.get(item.mainImageStoragePath) ?? null) : null,
          ),
        ),
        meta: {
          page: scopedQuery.page,
          limit: scopedQuery.limit,
          total,
          statusCounts,
          typeCounts,
        },
      }
    },

    async getListingById(id, actor) {
      return assertAccessible(id, actor)
    },

    async createListing(input, actor) {
      const providerId =
        actor.roles.includes('PROVIDER') && !isAdmin(actor.roles)
          ? await resolveOwnedProviderId(actor)
          : (input.providerId ?? null)
      if (isAdmin(actor.roles)) {
        // admins may choose any provider, or leave it unset
      } else if (actor.roles.includes('PROVIDER')) {
        if (input.providerId && input.providerId !== providerId) {
          throw forbidden('You can only create listings for your own provider')
        }
      } else {
        throw forbidden('Only admins and providers can manage listings')
      }

      assertRentalPair(input.rentalPrice ?? null, input.rentalUnit ?? null)
      const pricing = normalizePricing({
        price: input.price ?? null,
        priceMin: input.priceMin ?? null,
        priceMax: input.priceMax ?? null,
      })
      assertPricingMode(pricing.price, pricing.priceMin, pricing.priceMax)
      await assertRefs(providerId, input.categoryId ?? null)
      const created = await repository.create({
        providerId,
        categoryId: input.categoryId ?? null,
        name: input.name,
        description: input.description ?? null,
        brand: input.brand ?? null,
        unit: input.unit ?? null,
        currency: input.currency ? input.currency.toUpperCase() : null,
        price: pricing.price,
        priceMin: pricing.priceMin,
        priceMax: pricing.priceMax,
        rentalPrice: input.rentalPrice ?? null,
        rentalUnit: input.rentalUnit ?? null,
        quantityAvailable: input.quantityAvailable ?? null,
        status: input.status ?? 'ACTIVE',
      })
      return presentListing(created)
    },

    async updateListing(id, input, actor) {
      const listing = await loadOrThrow(id)
      await assertCanManageListingProvider(actor, listing.providerId)

      let nextProviderId = input.providerId === undefined ? listing.providerId : input.providerId
      if (actor.roles.includes('PROVIDER') && !isAdmin(actor.roles)) {
        nextProviderId = listing.providerId
        if (input.providerId !== undefined && input.providerId !== listing.providerId) {
          throw forbidden('You cannot move a listing to another provider')
        }
      }
      const nextCategoryId = input.categoryId === undefined ? listing.categoryId : input.categoryId
      const nextRentalPrice =
        input.rentalPrice === undefined ? listing.rentalPrice : input.rentalPrice
      const nextRentalUnit = input.rentalUnit === undefined ? listing.rentalUnit : input.rentalUnit
      assertRentalPair(nextRentalPrice, nextRentalUnit)

      const pricingTouched =
        input.price !== undefined || input.priceMin !== undefined || input.priceMax !== undefined
      const nextPricing = pricingTouched
        ? normalizePricing({
            price: input.price === undefined ? null : input.price,
            priceMin: input.priceMin === undefined ? null : input.priceMin,
            priceMax: input.priceMax === undefined ? null : input.priceMax,
          })
        : {
            price: listing.price,
            priceMin: listing.priceMin,
            priceMax: listing.priceMax,
          }
      assertPricingMode(nextPricing.price, nextPricing.priceMin, nextPricing.priceMax)

      if (input.providerId !== undefined || input.categoryId !== undefined) {
        await assertRefs(nextProviderId, nextCategoryId)
      }
      const updated = await repository.update(id, {
        ...input,
        providerId: nextProviderId,
        categoryId: nextCategoryId,
        currency:
          input.currency === undefined
            ? undefined
            : input.currency
              ? input.currency.toUpperCase()
              : null,
        ...(pricingTouched
          ? {
              price: nextPricing.price,
              priceMin: nextPricing.priceMin,
              priceMax: nextPricing.priceMax,
            }
          : {}),
      })
      return presentListing(updated)
    },

    async deleteListing(id, actor) {
      const listing = await loadOrThrow(id)
      await assertCanManageListingProvider(actor, listing.providerId)
      const outcome = await repository.deleteOrHide(id)
      if (outcome === 'missing') {
        throw notFound('Listing not found', 'LISTING_NOT_FOUND')
      }
      auditActivity({
        userId: actor.id,
        action: 'listings.delete',
        entity: 'listing',
        entityId: id,
        meta: { outcome },
      })
      return { outcome }
    },

    async bulkAdjustPrices(input, actor) {
      const providerId = await resolveManageProviderId(actor, input.providerId)
      const delta = Number(input.value)
      return repository.adjustProviderPrices({
        providerId,
        direction: input.direction,
        mode: input.mode,
        delta,
      })
    },

    async importListings(input, actor) {
      const providerId = await resolveManageProviderId(actor, input.providerId)
      const categories = await repository.findListingCategoriesForImport()
      const creates: CreateListingRecordInput[] = []
      const errors: ImportListingsResult['errors'] = []

      for (let index = 0; index < input.rows.length; index += 1) {
        const row = input.rows[index]!
        const parsed = parseImportRow(row, providerId, categories)
        if (!parsed.ok) {
          errors.push({ row: index + 2, reason: parsed.reason })
          continue
        }
        creates.push(parsed.data)
      }

      const created = await repository.createMany(creates)
      return {
        created,
        skipped: errors.length,
        errors: errors.slice(0, 50),
      }
    },
  }

  async function resolveManageProviderId(
    actor: AuthActor,
    requestedProviderId: string | undefined,
  ): Promise<string> {
    if (actor.roles.includes('PROVIDER') && !isAdmin(actor.roles)) {
      const providerId = await resolveOwnedProviderId(actor)
      if (requestedProviderId && requestedProviderId !== providerId) {
        throw forbidden('You can only manage listings for your own provider')
      }
      return providerId
    }
    if (isAdmin(actor.roles)) {
      if (!requestedProviderId) {
        throw validationError('providerId is required')
      }
      const provider = await repository.findProvider(requestedProviderId)
      if (!provider) throw notFound('Provider not found', 'LISTING_PROVIDER_NOT_FOUND')
      return requestedProviderId
    }
    throw forbidden('Only admins and providers can manage listings')
  }
}
