import { prisma } from '../../database/prisma.js'
import { runInTransaction } from '../../database/transaction.js'
import { conflict } from '../../errors/app-error.js'
import { type ListingStatus, Prisma, type RentalUnit } from '../../generated/prisma/client.js'
import type { ListingType, ListListingsQuery, UpdateListingBody } from './listings.schema.js'
import type { ListingSnapshot, ListingStatusCounts, ListingTypeCounts } from './listings.types.js'

const listingInclude = {
  provider: { select: { name: true } },
  category: { select: { name: true, nameAr: true, kind: true } },
  images: {
    where: { isMain: true },
    take: 1,
    select: { storagePath: true },
  },
} as const

type ListingRow = Prisma.ListingGetPayload<{ include: typeof listingInclude }>

export type ListingRecord = {
  id: string
  providerId: string | null
  providerName: string | null
  categoryId: string | null
  categoryName: string | null
  categoryNameAr: string | null
  categoryKind: 'MATERIAL' | 'EQUIPMENT' | 'SERVICE' | 'WORKER' | null
  type: ListingType | null
  name: string
  description: string | null
  brand: string | null
  unit: string | null
  currency: string | null
  price: string | null
  priceMin: string | null
  priceMax: string | null
  rentalPrice: string | null
  rentalUnit: RentalUnit | null
  quantityAvailable: string | null
  status: ListingStatus
  createdAt: Date
  updatedAt: Date
  mainImageStoragePath: string | null
}

export type CreateListingRecordInput = {
  providerId: string | null
  categoryId: string | null
  name: string
  description: string | null
  brand: string | null
  unit: string | null
  currency: string | null
  price: string | null
  priceMin: string | null
  priceMax: string | null
  rentalPrice: string | null
  rentalUnit: RentalUnit | null
  quantityAvailable: string | null
  status: ListingStatus
}

export type ListingChoiceFilters = {
  take: number
  categoryId?: string
  status?: ListingStatus
  q?: string
}

export type ListingsRepository = {
  findMany: (query: ListListingsQuery) => Promise<{ items: ListingRecord[]; total: number }>
  countByType: (providerId?: string) => Promise<ListingTypeCounts>
  countByStatus: (providerId?: string) => Promise<ListingStatusCounts>
  findById: (id: string) => Promise<ListingRecord | null>
  findSnapshotById: (id: string) => Promise<ListingSnapshot | null>
  findSnapshotsByIds: (ids: string[]) => Promise<ListingSnapshot[]>
  findNamesByIds: (ids: string[]) => Promise<Array<{ id: string; name: string }>>
  existsById: (id: string) => Promise<boolean>
  listChoices: (
    filters: ListingChoiceFilters,
  ) => Promise<Array<{ id: string; name: string; subtitle: string }>>
  findProvider: (id: string) => Promise<{ id: string } | null>
  findCategory: (id: string) => Promise<{
    id: string
    kind: NonNullable<ListingRecord['categoryKind']>
    scope: 'PLATFORM' | 'PROVIDER'
    isActive: boolean
  } | null>
  findListingCategoriesForImport: () => Promise<
    Array<{
      id: string
      name: string
      nameAr: string | null
      slug: string
      kind: 'MATERIAL' | 'EQUIPMENT' | 'SERVICE'
    }>
  >
  /**
   * Single-statement bulk price adjust under a transaction (row locks via UPDATE).
   * Avoids N sequential updates that overrun client/DB timeouts and encourage double-apply retries.
   */
  adjustProviderPrices: (input: {
    providerId: string
    direction: 'increase' | 'decrease'
    mode: 'percentage' | 'amount'
    delta: number
  }) => Promise<{ updated: number; skipped: number }>
  create: (input: CreateListingRecordInput) => Promise<ListingRecord>
  createMany: (inputs: CreateListingRecordInput[]) => Promise<number>
  update: (id: string, input: UpdateListingBody) => Promise<ListingRecord>
  countListingReviews: (id: string) => Promise<number>
  hide: (id: string) => Promise<ListingRecord>
  delete: (id: string) => Promise<void>
  /** FOR UPDATE + review count → hide or hard-delete without review race. */
  deleteOrHide: (id: string) => Promise<'hidden' | 'deleted' | 'missing'>
}

export function decimalToString(value: { toString(): string } | null): string | null {
  return value == null ? null : value.toString()
}

function listingTypeFromKind(
  kind: 'MATERIAL' | 'EQUIPMENT' | 'SERVICE' | 'WORKER' | null | undefined,
): ListingType | null {
  if (kind === 'MATERIAL' || kind === 'EQUIPMENT' || kind === 'SERVICE') return kind
  return null
}

function toRecord(row: ListingRow): ListingRecord {
  return {
    id: row.id,
    providerId: row.providerId,
    providerName: row.provider?.name ?? null,
    categoryId: row.categoryId,
    categoryName: row.category?.name ?? null,
    categoryNameAr: row.category?.nameAr ?? null,
    categoryKind: row.category?.kind ?? null,
    type: listingTypeFromKind(row.category?.kind),
    name: row.name,
    description: row.description,
    brand: row.brand,
    unit: row.unit,
    currency: row.currency,
    price: decimalToString(row.price),
    priceMin: decimalToString(row.priceMin),
    priceMax: decimalToString(row.priceMax),
    rentalPrice: decimalToString(row.rentalPrice),
    rentalUnit: row.rentalUnit,
    quantityAvailable: decimalToString(row.quantityAvailable),
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    mainImageStoragePath: row.images[0]?.storagePath ?? null,
  }
}

function listWhere(query: ListListingsQuery): Prisma.ListingWhereInput {
  return {
    providerId: query.providerId,
    categoryId: query.categoryId,
    status: query.status,
    ...(query.type ? { category: { kind: query.type } } : {}),
    // Keep search on trigram-indexed columns (name, brand) — avoid join ILIKE.
    ...(query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: 'insensitive' } },
            { brand: { contains: query.q, mode: 'insensitive' } },
          ],
        }
      : {}),
  }
}

async function loadSnapshotsByIds(ids: string[]): Promise<ListingSnapshot[]> {
  if (ids.length === 0) return []
  const rows = await prisma.listing.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      name: true,
      categoryId: true,
      brand: true,
      unit: true,
      currency: true,
      price: true,
      priceMin: true,
      priceMax: true,
      rentalPrice: true,
      rentalUnit: true,
      providerId: true,
      status: true,
      description: true,
      category: { select: { kind: true } },
    },
  })
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.category?.kind ?? null,
    categoryId: row.categoryId,
    brand: row.brand,
    unit: row.unit,
    currency: row.currency,
    price: decimalToString(row.price),
    priceMin: decimalToString(row.priceMin),
    priceMax: decimalToString(row.priceMax),
    rentalPrice: decimalToString(row.rentalPrice),
    rentalUnit: row.rentalUnit,
    providerId: row.providerId,
    status: row.status,
    description: row.description,
  }))
}

export function createListingsRepository(): ListingsRepository {
  return {
    async findMany(query) {
      const where = listWhere(query)
      const skip = (query.page - 1) * query.limit
      const [rows, total] = await Promise.all([
        prisma.listing.findMany({
          where,
          orderBy: [{ updatedAt: 'desc' }, { name: 'asc' }],
          skip,
          take: query.limit,
          select: {
            id: true,
            providerId: true,
            categoryId: true,
            name: true,
            brand: true,
            unit: true,
            currency: true,
            price: true,
            priceMin: true,
            priceMax: true,
            rentalPrice: true,
            rentalUnit: true,
            quantityAvailable: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            provider: { select: { name: true } },
            category: { select: { name: true, nameAr: true, kind: true } },
            images: {
              where: { isMain: true },
              take: 1,
              select: { storagePath: true },
            },
          },
        }),
        prisma.listing.count({ where }),
      ])
      // List omits description (detail-only) to keep card payloads lean.
      return {
        items: rows.map((row) =>
          toRecord({
            ...row,
            description: null,
            specs: null,
          } as ListingRow),
        ),
        total,
      }
    },

    async countByType(providerId) {
      const rows = await prisma.$queryRaw<Array<{ kind: string; count: number }>>`
        SELECT c.kind::text AS kind, COUNT(*)::int AS count
        FROM "listings" l
        INNER JOIN "categories" c ON c.id = l."categoryId"
        WHERE c.kind IN ('MATERIAL'::"CategoryKind", 'EQUIPMENT'::"CategoryKind", 'SERVICE'::"CategoryKind")
          ${providerId ? Prisma.sql`AND l."providerId" = ${providerId}` : Prisma.empty}
        GROUP BY c.kind
      `
      const counts: ListingTypeCounts = { MATERIAL: 0, EQUIPMENT: 0, SERVICE: 0 }
      for (const row of rows) {
        if (row.kind === 'MATERIAL' || row.kind === 'EQUIPMENT' || row.kind === 'SERVICE') {
          counts[row.kind] = row.count
        }
      }
      return counts
    },

    async countByStatus(providerId) {
      const groups = await prisma.listing.groupBy({
        by: ['status'],
        where: providerId ? { providerId } : undefined,
        _count: { _all: true },
      })
      const counts: ListingStatusCounts = { ACTIVE: 0, INACTIVE: 0 }
      for (const group of groups) {
        counts[group.status] = group._count._all
      }
      return counts
    },

    async findById(id) {
      const row = await prisma.listing.findUnique({ where: { id }, include: listingInclude })
      return row ? toRecord(row) : null
    },

    async findSnapshotById(id) {
      const rows = await loadSnapshotsByIds([id])
      return rows[0] ?? null
    },

    findSnapshotsByIds: loadSnapshotsByIds,

    async findNamesByIds(ids) {
      if (ids.length === 0) return []
      return prisma.listing.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true },
      })
    },

    async existsById(id) {
      const row = await prisma.listing.findUnique({ where: { id }, select: { id: true } })
      return row != null
    },

    async listChoices(filters) {
      const rows = await prisma.listing.findMany({
        where: {
          ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
          ...(filters.status ? { status: filters.status } : {}),
          ...(filters.q
            ? {
                OR: [
                  { name: { contains: filters.q, mode: 'insensitive' } },
                  { brand: { contains: filters.q, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        orderBy: { name: 'asc' },
        take: filters.take,
        select: { id: true, name: true, category: { select: { kind: true } } },
      })
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        subtitle: row.category?.kind ?? 'Uncategorized',
      }))
    },

    async findProvider(id) {
      return prisma.provider.findUnique({ where: { id }, select: { id: true } })
    },

    async findCategory(id) {
      return prisma.category.findUnique({
        where: { id },
        select: { id: true, kind: true, scope: true, isActive: true },
      })
    },

    async findListingCategoriesForImport() {
      const rows = await prisma.category.findMany({
        where: {
          scope: 'PLATFORM',
          isActive: true,
          kind: { in: ['MATERIAL', 'EQUIPMENT', 'SERVICE'] },
        },
        select: { id: true, name: true, nameAr: true, slug: true, kind: true },
        orderBy: { name: 'asc' },
      })
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        nameAr: row.nameAr,
        slug: row.slug,
        kind: row.kind as 'MATERIAL' | 'EQUIPMENT' | 'SERVICE',
      }))
    },

    async adjustProviderPrices(input) {
      const maxDecimal184 = 99_999_999_999_999
      return runInTransaction(async (tx) => {
        // Allow large catalogs without hitting the pool's default statement_timeout.
        await tx.$executeRaw`SET LOCAL statement_timeout = '120000'`

        const total = await tx.listing.count({ where: { providerId: input.providerId } })

        let updated: number
        if (input.mode === 'percentage') {
          const factor =
            input.direction === 'increase' ? 1 + input.delta / 100 : 1 - input.delta / 100
          updated = await tx.$executeRaw`
            UPDATE listings
            SET
              price = CASE
                WHEN price IS NULL THEN NULL
                ELSE LEAST(GREATEST(ROUND(price * ${factor}::numeric, 4), 0), ${maxDecimal184}::numeric)
              END,
              "priceMin" = CASE
                WHEN "priceMin" IS NULL THEN NULL
                ELSE LEAST(GREATEST(ROUND("priceMin" * ${factor}::numeric, 4), 0), ${maxDecimal184}::numeric)
              END,
              "priceMax" = CASE
                WHEN "priceMax" IS NULL THEN NULL
                ELSE LEAST(GREATEST(ROUND("priceMax" * ${factor}::numeric, 4), 0), ${maxDecimal184}::numeric)
              END,
              "rentalPrice" = CASE
                WHEN "rentalPrice" IS NULL THEN NULL
                ELSE LEAST(GREATEST(ROUND("rentalPrice" * ${factor}::numeric, 4), 0), ${maxDecimal184}::numeric)
              END,
              "updatedAt" = NOW()
            WHERE "providerId" = ${input.providerId}
              AND (
                price IS NOT NULL
                OR "priceMin" IS NOT NULL
                OR "priceMax" IS NOT NULL
                OR "rentalPrice" IS NOT NULL
              )
          `
        } else {
          const amount = input.direction === 'increase' ? input.delta : -input.delta
          updated = await tx.$executeRaw`
            UPDATE listings
            SET
              price = CASE
                WHEN price IS NULL THEN NULL
                ELSE LEAST(GREATEST(ROUND(price + ${amount}::numeric, 4), 0), ${maxDecimal184}::numeric)
              END,
              "priceMin" = CASE
                WHEN "priceMin" IS NULL THEN NULL
                ELSE LEAST(GREATEST(ROUND("priceMin" + ${amount}::numeric, 4), 0), ${maxDecimal184}::numeric)
              END,
              "priceMax" = CASE
                WHEN "priceMax" IS NULL THEN NULL
                ELSE LEAST(GREATEST(ROUND("priceMax" + ${amount}::numeric, 4), 0), ${maxDecimal184}::numeric)
              END,
              "rentalPrice" = CASE
                WHEN "rentalPrice" IS NULL THEN NULL
                ELSE LEAST(GREATEST(ROUND("rentalPrice" + ${amount}::numeric, 4), 0), ${maxDecimal184}::numeric)
              END,
              "updatedAt" = NOW()
            WHERE "providerId" = ${input.providerId}
              AND (
                price IS NOT NULL
                OR "priceMin" IS NOT NULL
                OR "priceMax" IS NOT NULL
                OR "rentalPrice" IS NOT NULL
              )
          `
        }

        return { updated, skipped: Math.max(0, total - updated) }
      })
    },

    async create(input) {
      const row = await prisma.listing.create({
        data: input,
        include: listingInclude,
      })
      return toRecord(row)
    },

    async createMany(inputs) {
      if (inputs.length === 0) return 0
      const result = await prisma.listing.createMany({ data: inputs })
      return result.count
    },

    async update(id, input) {
      const { expectedUpdatedAt, ...fields } = input
      const expected = new Date(expectedUpdatedAt)
      if (Number.isNaN(expected.getTime())) {
        throw conflict('expectedUpdatedAt must be a valid timestamp', 'LISTING_VERSION_INVALID')
      }

      const cas = await prisma.listing.updateMany({
        where: { id, updatedAt: expected },
        data: {
          providerId: fields.providerId,
          categoryId: fields.categoryId,
          name: fields.name,
          description: fields.description,
          brand: fields.brand,
          unit: fields.unit,
          currency: fields.currency,
          price: fields.price,
          priceMin: fields.priceMin,
          priceMax: fields.priceMax,
          rentalPrice: fields.rentalPrice,
          rentalUnit: fields.rentalUnit,
          quantityAvailable: fields.quantityAvailable,
          status: fields.status,
        },
      })
      if (cas.count !== 1) {
        throw conflict(
          'Listing was modified elsewhere; reload and try again',
          'LISTING_VERSION_CONFLICT',
        )
      }

      const row = await prisma.listing.findUniqueOrThrow({
        where: { id },
        include: listingInclude,
      })
      return toRecord(row)
    },

    async countListingReviews(id) {
      return prisma.review.count({ where: { targetType: 'LISTING', targetId: id } })
    },

    async hide(id) {
      const row = await prisma.listing.update({
        where: { id },
        data: { status: 'INACTIVE' },
        include: listingInclude,
      })
      return toRecord(row)
    },

    async delete(id) {
      await prisma.listing.delete({ where: { id } })
    },

    async deleteOrHide(id) {
      return runInTransaction(async (tx) => {
        const locked = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM listings WHERE id = ${id} FOR UPDATE
        `
        if (locked.length === 0) return 'missing' as const

        const reviewCount = await tx.review.count({
          where: { targetType: 'LISTING', targetId: id },
        })
        if (reviewCount > 0) {
          await tx.listing.update({
            where: { id },
            data: { status: 'INACTIVE' },
          })
          return 'hidden' as const
        }
        await tx.listing.delete({ where: { id } })
        return 'deleted' as const
      })
    },
  }
}
