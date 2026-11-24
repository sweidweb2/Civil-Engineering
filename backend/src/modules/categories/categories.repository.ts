import { prisma } from '../../database/prisma.js'
import { translateUniqueConflict } from '../../database/unique-conflict.js'
import type { CategoryKind, Prisma } from '../../generated/prisma/client.js'
import type { ListCategoriesQuery, UpdateCategoryBody } from './categories.schema.js'
import type { CategoryKindCounts } from './categories.types.js'

const categoryInclude = {
  parent: { select: { name: true, nameAr: true } },
  _count: { select: { children: true, listings: true } },
} as const

const categoryLeanInclude = {
  parent: { select: { name: true, nameAr: true } },
} as const

type CategoryRow = Prisma.CategoryGetPayload<{ include: typeof categoryInclude }>
type CategoryLeanRow = Prisma.CategoryGetPayload<{ include: typeof categoryLeanInclude }>

export type CategoryRecord = {
  id: string
  scope: 'PLATFORM' | 'PROVIDER'
  providerId: string | null
  kind: CategoryKind
  name: string
  nameAr: string | null
  slug: string
  parentId: string | null
  parentName: string | null
  parentNameAr: string | null
  imagePath: string | null
  isActive: boolean
  sortOrder: number
  childCount: number
  listingCount: number
  createdAt: Date
  updatedAt: Date
}

export type CreateCategoryRecordInput = {
  name: string
  nameAr: string | null
  slug: string
  kind: CategoryKind
  parentId: string | null
  isActive: boolean
  sortOrder: number
}

export type CategoriesRepository = {
  findMany: (query: ListCategoriesQuery) => Promise<{ items: CategoryRecord[]; total: number }>
  countByKind: () => Promise<CategoryKindCounts>
  findById: (id: string) => Promise<CategoryRecord | null>
  /** Lean lookup for cross-module callers; null when missing or not PLATFORM scope. */
  findPlatformById: (id: string) => Promise<{ id: string; isActive: boolean } | null>
  findDuplicate: (input: {
    kind: CategoryKind
    parentId: string | null
    slug: string
    name: string
    exceptId?: string
  }) => Promise<{ id: string } | null>
  create: (input: CreateCategoryRecordInput) => Promise<CategoryRecord>
  update: (id: string, input: UpdateCategoryBody & { slug?: string }) => Promise<CategoryRecord>
  updateImagePath: (id: string, imagePath: string | null) => Promise<CategoryRecord>
  delete: (id: string) => Promise<void>
}

function toRecord(row: CategoryRow): CategoryRecord {
  return {
    id: row.id,
    scope: row.scope,
    providerId: row.providerId,
    kind: row.kind,
    name: row.name,
    nameAr: row.nameAr,
    slug: row.slug,
    parentId: row.parentId,
    parentName: row.parent?.name ?? null,
    parentNameAr: row.parent?.nameAr ?? null,
    imagePath: row.imagePath,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    childCount: row._count.children,
    listingCount: row._count.listings,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function toLeanRecord(row: CategoryLeanRow): CategoryRecord {
  return {
    id: row.id,
    scope: row.scope,
    providerId: row.providerId,
    kind: row.kind,
    name: row.name,
    nameAr: row.nameAr,
    slug: row.slug,
    parentId: row.parentId,
    parentName: row.parent?.name ?? null,
    parentNameAr: row.parent?.nameAr ?? null,
    imagePath: row.imagePath,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    childCount: 0,
    listingCount: 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function listWhere(query: ListCategoriesQuery): Prisma.CategoryWhereInput {
  return {
    scope: 'PLATFORM',
    kind: query.kind,
    ...(query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: 'insensitive' } },
            { nameAr: { contains: query.q, mode: 'insensitive' } },
            { slug: { contains: query.q, mode: 'insensitive' } },
            { parent: { name: { contains: query.q, mode: 'insensitive' } } },
            { parent: { nameAr: { contains: query.q, mode: 'insensitive' } } },
          ],
        }
      : {}),
  }
}

export function createCategoriesRepository(): CategoriesRepository {
  return {
    async findMany(query) {
      const where = listWhere(query)
      const skip = (query.page - 1) * query.limit
      const includeCounts = query.includeCounts !== false
      if (!includeCounts) {
        const [rows, total] = await Promise.all([
          prisma.category.findMany({
            where,
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
            skip,
            take: query.limit,
            include: categoryLeanInclude,
          }),
          prisma.category.count({ where }),
        ])
        return { items: rows.map(toLeanRecord), total }
      }
      const [rows, total] = await Promise.all([
        prisma.category.findMany({
          where,
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          skip,
          take: query.limit,
          include: categoryInclude,
        }),
        prisma.category.count({ where }),
      ])
      return { items: rows.map(toRecord), total }
    },

    async countByKind() {
      const groups = await prisma.category.groupBy({
        by: ['kind'],
        where: { scope: 'PLATFORM' },
        _count: { _all: true },
      })
      const counts: CategoryKindCounts = { MATERIAL: 0, EQUIPMENT: 0, SERVICE: 0, WORKER: 0 }
      for (const group of groups) {
        counts[group.kind] = group._count._all
      }
      return counts
    },

    async findById(id) {
      const row = await prisma.category.findUnique({ where: { id }, include: categoryInclude })
      return row ? toRecord(row) : null
    },

    async findPlatformById(id) {
      return prisma.category.findFirst({
        where: { id, scope: 'PLATFORM' },
        select: { id: true, isActive: true },
      })
    },

    async findDuplicate(input) {
      return prisma.category.findFirst({
        where: {
          scope: 'PLATFORM',
          kind: input.kind,
          parentId: input.parentId,
          id: input.exceptId ? { not: input.exceptId } : undefined,
          OR: [{ slug: input.slug }, { name: { equals: input.name, mode: 'insensitive' } }],
        },
        select: { id: true },
      })
    },

    async create(input) {
      const row = await translateUniqueConflict(() =>
        prisma.category.create({
          data: {
            scope: 'PLATFORM',
            providerId: null,
            kind: input.kind,
            name: input.name,
            nameAr: input.nameAr,
            slug: input.slug,
            parentId: input.parentId,
            isActive: input.isActive,
            sortOrder: input.sortOrder,
          },
          include: categoryInclude,
        }),
      )
      return toRecord(row)
    },

    async update(id, input) {
      const row = await translateUniqueConflict(() =>
        prisma.category.update({
          where: { id },
          data: {
            name: input.name,
            nameAr: input.nameAr,
            slug: input.slug,
            kind: input.kind,
            parentId: input.parentId,
            isActive: input.isActive,
            sortOrder: input.sortOrder,
          },
          include: categoryInclude,
        }),
      )
      return toRecord(row)
    },

    async updateImagePath(id, imagePath) {
      const row = await prisma.category.update({
        where: { id },
        data: { imagePath },
        include: categoryInclude,
      })
      return toRecord(row)
    },

    async delete(id) {
      await prisma.category.delete({ where: { id } })
    },
  }
}
