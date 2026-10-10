import { prisma } from '../../database/prisma.js'
import type { Prisma, ReviewStatus, ReviewTargetType } from '../../generated/prisma/client.js'
import {
  findListingNames,
  listingExists,
  listListingChoices,
  searchListingIdsByName,
} from '../listings/index.js'
import type { ListReviewsQuery, UpdateReviewBody } from './reviews.schema.js'
import type { ReviewStatusCounts, ReviewTargetOption } from './reviews.types.js'

const authorSelect = {
  id: true,
  email: true,
  profile: { select: { displayName: true, firstName: true, lastName: true } },
} as const

const reviewInclude = { author: { select: authorSelect } } as const

type ReviewRow = Prisma.ReviewGetPayload<{ include: typeof reviewInclude }>

type ProfileName = {
  displayName: string | null
  firstName: string | null
  lastName: string | null
} | null

export type ReviewRecord = {
  id: string
  authorId: string
  authorEmail: string
  authorName: string
  targetType: ReviewTargetType
  targetId: string
  targetName: string
  rating: number
  comment: string
  status: ReviewStatus
  createdAt: Date
  updatedAt: Date
}

export type CreateReviewRecordInput = {
  authorId: string
  targetType: ReviewTargetType
  targetId: string
  rating: number
  comment: string
  status: ReviewStatus
}

export type ReviewsRepository = {
  findMany: (query: ListReviewsQuery) => Promise<{ items: ReviewRecord[]; total: number }>
  countByStatus: () => Promise<ReviewStatusCounts>
  findById: (id: string) => Promise<ReviewRecord | null>
  findDuplicate: (
    authorId: string,
    targetType: ReviewTargetType,
    targetId: string,
  ) => Promise<{ id: string } | null>
  findAuthor: (id: string) => Promise<{ id: string; status: string } | null>
  findTargetState: (
    targetType: ReviewTargetType,
    targetId: string,
  ) => Promise<'ok' | 'missing' | 'not_worker'>
  listTargets: (targetType: ReviewTargetType) => Promise<ReviewTargetOption[]>
  create: (input: CreateReviewRecordInput) => Promise<ReviewRecord>
  update: (id: string, input: UpdateReviewBody) => Promise<ReviewRecord>
  delete: (id: string) => Promise<void>
}

function personName(profile: ProfileName, email: string): string {
  if (!profile) return email
  return (
    profile.displayName ||
    [profile.firstName, profile.lastName].filter(Boolean).join(' ') ||
    email
  )
}

function toRecord(row: ReviewRow, targetName: string): ReviewRecord {
  return {
    id: row.id,
    authorId: row.authorId,
    authorEmail: row.author.email,
    authorName: personName(row.author.profile, row.author.email),
    targetType: row.targetType,
    targetId: row.targetId,
    targetName,
    rating: row.rating,
    comment: row.comment,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

async function targetNameMap(rows: ReviewRow[]): Promise<Map<string, string>> {
  const providerIds = uniqueIds(rows, 'PROVIDER')
  const workerIds = uniqueIds(rows, 'WORKER')
  const listingIds = uniqueIds(rows, 'LISTING')
  const names = new Map<string, string>()

  const [providers, workers, listings] = await Promise.all([
    providerIds.length
      ? prisma.provider.findMany({ where: { id: { in: providerIds } }, select: { id: true, name: true } })
      : [],
    workerIds.length
      ? prisma.user.findMany({
          where: { id: { in: workerIds } },
          select: { id: true, email: true, profile: { select: { displayName: true, firstName: true, lastName: true } } },
        })
      : [],
    findListingNames(listingIds),
  ])

  for (const provider of providers) names.set(key('PROVIDER', provider.id), provider.name)
  for (const worker of workers) names.set(key('WORKER', worker.id), personName(worker.profile, worker.email))
  for (const listing of listings) names.set(key('LISTING', listing.id), listing.name)
  return names
}

function uniqueIds(rows: ReviewRow[], targetType: ReviewTargetType): string[] {
  return [...new Set(rows.filter((row) => row.targetType === targetType).map((row) => row.targetId))]
}

function key(targetType: ReviewTargetType, targetId: string): string {
  return `${targetType}:${targetId}`
}

async function withNames(rows: ReviewRow[]): Promise<ReviewRecord[]> {
  const names = await targetNameMap(rows)
  return rows.map((row) => toRecord(row, names.get(key(row.targetType, row.targetId)) ?? 'Removed target'))
}

async function searchWhere(query: ListReviewsQuery): Promise<Prisma.ReviewWhereInput> {
  const filters: Prisma.ReviewWhereInput[] = []
  if (query.status) filters.push({ status: query.status })
  if (query.targetType) filters.push({ targetType: query.targetType })
  if (!query.q) return filters.length ? { AND: filters } : {}

  const q = query.q
  const text: Prisma.ReviewWhereInput = {
    OR: [
      { comment: { contains: q, mode: 'insensitive' } },
      { author: { email: { contains: q, mode: 'insensitive' } } },
      { author: { profile: { displayName: { contains: q, mode: 'insensitive' } } } },
      { author: { profile: { firstName: { contains: q, mode: 'insensitive' } } } },
      { author: { profile: { lastName: { contains: q, mode: 'insensitive' } } } },
    ],
  }

  const [providers, workers, listings] = await Promise.all([
    prisma.provider.findMany({
      where: { name: { contains: q, mode: 'insensitive' } },
      select: { id: true },
      take: 100,
    }),
    prisma.user.findMany({
      where: {
        role: 'WORKER',
        OR: [
          { email: { contains: q, mode: 'insensitive' } },
          { profile: { displayName: { contains: q, mode: 'insensitive' } } },
          { profile: { firstName: { contains: q, mode: 'insensitive' } } },
          { profile: { lastName: { contains: q, mode: 'insensitive' } } },
        ],
      },
      select: { id: true },
      take: 100,
    }),
    searchListingIdsByName(q, 100),
  ])

  const or = text.OR ?? []
  if (providers.length) or.push({ targetType: 'PROVIDER', targetId: { in: providers.map((row) => row.id) } })
  if (workers.length) or.push({ targetType: 'WORKER', targetId: { in: workers.map((row) => row.id) } })
  if (listings.length) or.push({ targetType: 'LISTING', targetId: { in: listings } })
  filters.push({ OR: or })
  return { AND: filters }
}

export function createReviewsRepository(): ReviewsRepository {
  return {
    async findMany(query) {
      const where = await searchWhere(query)
      const skip = (query.page - 1) * query.limit
      const [rows, total] = await Promise.all([
        prisma.review.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: query.limit,
          include: reviewInclude,
        }),
        prisma.review.count({ where }),
      ])
      return { items: await withNames(rows), total }
    },

    async countByStatus() {
      const groups = await prisma.review.groupBy({
        by: ['status'],
        _count: { _all: true },
      })
      const counts: ReviewStatusCounts = { PENDING: 0, ACCEPTED: 0, REJECTED: 0 }
      for (const group of groups) {
        counts[group.status] = group._count._all
      }
      return counts
    },

    async findById(id) {
      const row = await prisma.review.findUnique({ where: { id }, include: reviewInclude })
      if (!row) return null
      const [record] = await withNames([row])
      return record ?? null
    },

    async findDuplicate(authorId, targetType, targetId) {
      return prisma.review.findUnique({
        where: { authorId_targetType_targetId: { authorId, targetType, targetId } },
        select: { id: true },
      })
    },

    async findAuthor(id) {
      return prisma.user.findUnique({ where: { id }, select: { id: true, status: true } })
    },

    async findTargetState(targetType, targetId) {
      if (targetType === 'PROVIDER') {
        const provider = await prisma.provider.findUnique({ where: { id: targetId }, select: { id: true } })
        return provider ? 'ok' : 'missing'
      }
      if (targetType === 'LISTING') {
        return (await listingExists(targetId)) ? 'ok' : 'missing'
      }
      const worker = await prisma.user.findUnique({
        where: { id: targetId },
        select: { id: true, role: true },
      })
      if (!worker) return 'missing'
      return worker.role === 'WORKER' ? 'ok' : 'not_worker'
    },

    async listTargets(targetType) {
      if (targetType === 'PROVIDER') {
        const rows = await prisma.provider.findMany({
          orderBy: { name: 'asc' },
          take: 100,
          select: { id: true, name: true, city: true },
        })
        return rows.map((row) => ({ id: row.id, name: row.name, subtitle: row.city }))
      }
      if (targetType === 'LISTING') {
        return listListingChoices(100)
      }
      const rows = await prisma.user.findMany({
        where: { role: 'WORKER' },
        orderBy: { email: 'asc' },
        take: 100,
        select: { id: true, email: true, profile: { select: { displayName: true, firstName: true, lastName: true } } },
      })
      return rows.map((row) => ({
        id: row.id,
        name: personName(row.profile, row.email),
        subtitle: row.email,
      }))
    },

    async create(input) {
      const row = await prisma.review.create({
        data: input,
        include: reviewInclude,
      })
      const [record] = await withNames([row])
      if (!record) {
        throw new Error('Created review could not be loaded')
      }
      return record
    },

    async update(id, input) {
      const row = await prisma.review.update({
        where: { id },
        data: {
          targetType: input.targetType,
          targetId: input.targetId,
          rating: input.rating,
          comment: input.comment,
          status: input.status,
        },
        include: reviewInclude,
      })
      const [record] = await withNames([row])
      if (!record) {
        throw new Error('Updated review could not be loaded')
      }
      return record
    },

    async delete(id) {
      await prisma.review.delete({ where: { id } })
    },
  }
}
