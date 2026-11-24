import { prisma } from '../../database/prisma.js'
import type { Prisma } from '../../generated/prisma/client.js'
import type {
  CreateDesignOfferData,
  DesignOfferRecord,
  ListDesignOffersFilter,
  UpdateDesignOfferData,
} from './design-offers.types.js'

function toRecord(row: {
  id: string
  title: string
  description: string
  priceStart: { toString(): string }
  priceEnd: { toString(): string }
  currency: string
  imagePath: string | null
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}): DesignOfferRecord {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priceStart: row.priceStart.toString(),
    priceEnd: row.priceEnd.toString(),
    currency: row.currency,
    imagePath: row.imagePath,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export type DesignOffersRepository = {
  findMany: (
    filter: ListDesignOffersFilter,
  ) => Promise<{ items: DesignOfferRecord[]; total: number }>
  findById: (id: string) => Promise<DesignOfferRecord | null>
  create: (data: CreateDesignOfferData) => Promise<DesignOfferRecord>
  update: (id: string, data: UpdateDesignOfferData) => Promise<DesignOfferRecord>
  updateImagePath: (id: string, imagePath: string | null) => Promise<DesignOfferRecord>
  delete: (id: string) => Promise<void>
  countRequests: (id: string) => Promise<number>
}

export function createDesignOffersRepository(): DesignOffersRepository {
  return {
    async findMany(filter) {
      const where: Prisma.DesignOfferWhereInput = {
        ...(filter.activeOnly ? { isActive: true } : {}),
        ...(filter.q
          ? {
              OR: [
                { title: { contains: filter.q, mode: 'insensitive' } },
                { description: { contains: filter.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      }
      const skip = (filter.page - 1) * filter.limit
      const [rows, total] = await Promise.all([
        prisma.designOffer.findMany({
          where,
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
          skip,
          take: filter.limit,
        }),
        prisma.designOffer.count({ where }),
      ])
      return { items: rows.map(toRecord), total }
    },

    async findById(id) {
      const row = await prisma.designOffer.findUnique({ where: { id } })
      return row ? toRecord(row) : null
    },

    async create(data) {
      const row = await prisma.designOffer.create({
        data: {
          title: data.title,
          description: data.description,
          priceStart: data.priceStart,
          priceEnd: data.priceEnd,
          currency: data.currency,
          isActive: data.isActive,
          sortOrder: data.sortOrder,
        },
      })
      return toRecord(row)
    },

    async update(id, data) {
      const row = await prisma.designOffer.update({
        where: { id },
        data: {
          ...(data.title !== undefined ? { title: data.title } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.priceStart !== undefined ? { priceStart: data.priceStart } : {}),
          ...(data.priceEnd !== undefined ? { priceEnd: data.priceEnd } : {}),
          ...(data.currency !== undefined ? { currency: data.currency } : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
          ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
        },
      })
      return toRecord(row)
    },

    async updateImagePath(id, imagePath) {
      const row = await prisma.designOffer.update({
        where: { id },
        data: { imagePath },
      })
      return toRecord(row)
    },

    async delete(id) {
      await prisma.designOffer.delete({ where: { id } })
    },

    async countRequests(id) {
      return prisma.designRequest.count({ where: { designOfferId: id } })
    },
  }
}
