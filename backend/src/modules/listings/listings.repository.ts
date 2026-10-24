import { prisma } from '../../database/prisma.js'
import type { ListingStatus, ListingType, Prisma, RentalUnit } from '../../generated/prisma/client.js'
import type { ListListingsQuery, UpdateListingBody } from './listings.schema.js'
import type { ListingTypeCounts } from './listings.types.js'

const listingInclude = {
  provider: { select: { name: true } },
  category: { select: { name: true, kind: true } },
  images: {
    where: { isMain: true },
    take: 1,
    select: { storagePath: true },
  },
} as const

type ListingRow = Prisma.ListingGetPayload<{ include: typeof listingInclude }>

export type ListingRecord = {
  id: string
  providerId: string
  providerName: string
  categoryId: string
  categoryName: string
  categoryKind: 'MATERIAL' | 'EQUIPMENT' | 'SERVICE' | 'WORKER'
  type: ListingType
  name: string
  description: string | null
  brand: string | null
  unit: string
  currency: string
  price: string
  rentalPrice: string | null
  rentalUnit: RentalUnit | null
  quantityAvailable: string | null
  status: ListingStatus
  createdAt: Date
  updatedAt: Date
  mainImageStoragePath: string | null
}

export type CreateListingRecordInput = {
  providerId: string
  categoryId: string
  type: ListingType
  name: string
  description: string | null
  brand: string | null
  unit: string
  currency: string
  price: string
  rentalPrice: string | null
  rentalUnit: RentalUnit | null
  quantityAvailable: string | null
  status: ListingStatus
}

export type ListingsRepository = {
  findMany: (query: ListListingsQuery) => Promise<{ items: ListingRecord[]; total: number }>
  countByType: (providerId?: string) => Promise<ListingTypeCounts>
  findById: (id: string) => Promise<ListingRecord | null>
  findProvider: (id: string) => Promise<{ id: string } | null>
  findCategory: (
    id: string,
  ) => Promise<{
    id: string
    kind: ListingRecord['categoryKind']
    scope: 'PLATFORM' | 'PROVIDER'
    isActive: boolean
  } | null>
  create: (input: CreateListingRecordInput) => Promise<ListingRecord>
  update: (id: string, input: UpdateListingBody) => Promise<ListingRecord>
  countListingReviews: (id: string) => Promise<number>
  hide: (id: string) => Promise<ListingRecord>
  delete: (id: string) => Promise<void>
}

export function decimalToString(value: { toString(): string } | null): string | null {
  return value == null ? null : value.toString()
}

function toRecord(row: ListingRow): ListingRecord {
  return {
    id: row.id,
    providerId: row.providerId,
    providerName: row.provider.name,
    categoryId: row.categoryId,
    categoryName: row.category.name,
    categoryKind: row.category.kind,
    type: row.type,
    name: row.name,
    description: row.description,
    brand: row.brand,
    unit: row.unit,
    currency: row.currency,
    price: row.price.toString(),
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
    type: query.type,
    status: query.status,
    ...(query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: 'insensitive' } },
            { brand: { contains: query.q, mode: 'insensitive' } },
            { provider: { name: { contains: query.q, mode: 'insensitive' } } },
            { category: { name: { contains: query.q, mode: 'insensitive' } } },
          ],
        }
      : {}),
  }
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
          include: listingInclude,
        }),
        prisma.listing.count({ where }),
      ])
      return { items: rows.map(toRecord), total }
    },

    async countByType(providerId) {
      const groups = await prisma.listing.groupBy({
        by: ['type'],
        where: providerId ? { providerId } : undefined,
        _count: { _all: true },
      })
      const counts: ListingTypeCounts = { MATERIAL: 0, EQUIPMENT: 0, SERVICE: 0 }
      for (const group of groups) {
        counts[group.type] = group._count._all
      }
      return counts
    },

    async findById(id) {
      const row = await prisma.listing.findUnique({ where: { id }, include: listingInclude })
      return row ? toRecord(row) : null
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

    async create(input) {
      const row = await prisma.listing.create({
        data: input,
        include: listingInclude,
      })
      return toRecord(row)
    },

    async update(id, input) {
      const row = await prisma.listing.update({
        where: { id },
        data: {
          providerId: input.providerId,
          categoryId: input.categoryId,
          type: input.type,
          name: input.name,
          description: input.description,
          brand: input.brand,
          unit: input.unit,
          currency: input.currency,
          price: input.price,
          rentalPrice: input.rentalPrice,
          rentalUnit: input.rentalUnit,
          quantityAvailable: input.quantityAvailable,
          status: input.status,
        },
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
  }
}
