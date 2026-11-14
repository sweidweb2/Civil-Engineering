import { prisma } from '../../database/prisma.js'
import { Prisma, type ReviewStatus, type ReviewTargetType } from '../../generated/prisma/client.js'
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
  /** null for LISTING targets: names are resolved by the service via the listings module. */
  targetName: string | null
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

export type NonListingTargetType = Exclude<ReviewTargetType, 'LISTING'>

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
  /** LISTING targets are validated by the service through the listings module. */
  findTargetState: (
    targetType: NonListingTargetType,
    targetId: string,
  ) => Promise<'ok' | 'missing' | 'not_worker'>
  listTargets: (targetType: NonListingTargetType) => Promise<ReviewTargetOption[]>
  create: (input: CreateReviewRecordInput) => Promise<ReviewRecord>
  update: (id: string, input: UpdateReviewBody) => Promise<ReviewRecord>
  delete: (id: string) => Promise<void>
}

function personName(profile: ProfileName, email: string): string {
  if (!profile) return email
  return (
    profile.displayName || [profile.firstName, profile.lastName].filter(Boolean).join(' ') || email
  )
}

function toRecord(row: ReviewRow, targetName: string | null): ReviewRecord {
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
  const names = new Map<string, string>()

  const [providers, workers] = await Promise.all([
    providerIds.length
      ? prisma.provider.findMany({
          where: { id: { in: providerIds } },
          select: { id: true, name: true },
        })
      : [],
    workerIds.length
      ? prisma.user.findMany({
          where: { id: { in: workerIds } },
          select: {
            id: true,
            email: true,
            profile: { select: { displayName: true, firstName: true, lastName: true } },
          },
        })
      : [],
  ])

  for (const provider of providers) names.set(key('PROVIDER', provider.id), provider.name)
  for (const worker of workers)
    names.set(key('WORKER', worker.id), personName(worker.profile, worker.email))
  return names
}

function uniqueIds(rows: ReviewRow[], targetType: ReviewTargetType): string[] {
  return [
    ...new Set(rows.filter((row) => row.targetType === targetType).map((row) => row.targetId)),
  ]
}

function key(targetType: ReviewTargetType, targetId: string): string {
  return `${targetType}:${targetId}`
}

async function withNames(rows: ReviewRow[]): Promise<ReviewRecord[]> {
  const names = await targetNameMap(rows)
  return rows.map((row) => {
    // LISTING names are resolved by the service through the listings module.
    if (row.targetType === 'LISTING') return toRecord(row, null)
    return toRecord(row, names.get(key(row.targetType, row.targetId)) ?? 'Removed target')
  })
}

function ilikePattern(value: string): string {
  return `%${value.replace(/[\\%_]/g, (char) => `\\${char}`)}%`
}

// Documented exception: free-text search joins `listings` in SQL so a name match can filter
// reviews in one query. Replacing it with a listings-module lookup would cap matches; revisit later.
function reviewSearchFilter(query: ListReviewsQuery): Prisma.Sql {
  const pattern = ilikePattern(query.q ?? '')
  const status = query.status ?? null
  const targetType = query.targetType ?? null
  return Prisma.sql`
    (${status}::text IS NULL OR r.status = ${status}::"ReviewStatus")
    AND (${targetType}::text IS NULL OR r."targetType" = ${targetType}::"ReviewTargetType")
    AND (
      r.comment ILIKE ${pattern} ESCAPE '\\'
      OR u.email ILIKE ${pattern} ESCAPE '\\'
      OR p."displayName" ILIKE ${pattern} ESCAPE '\\'
      OR p."firstName" ILIKE ${pattern} ESCAPE '\\'
      OR p."lastName" ILIKE ${pattern} ESCAPE '\\'
      OR EXISTS (
        SELECT 1 FROM providers pr
        WHERE r."targetType" = 'PROVIDER'
          AND pr.id = r."targetId"
          AND pr.name ILIKE ${pattern} ESCAPE '\\'
      )
      OR EXISTS (
        SELECT 1 FROM users w
        LEFT JOIN profiles wp ON wp."userId" = w.id
        WHERE r."targetType" = 'WORKER'
          AND w.id = r."targetId"
          AND w.role = 'WORKER'
          AND (
            w.email ILIKE ${pattern} ESCAPE '\\'
            OR wp."displayName" ILIKE ${pattern} ESCAPE '\\'
            OR wp."firstName" ILIKE ${pattern} ESCAPE '\\'
            OR wp."lastName" ILIKE ${pattern} ESCAPE '\\'
          )
      )
      OR EXISTS (
        SELECT 1 FROM listings l
        WHERE r."targetType" = 'LISTING'
          AND l.id = r."targetId"
          AND l.name ILIKE ${pattern} ESCAPE '\\'
      )
    )
  `
}

async function searchReviews(
  query: ListReviewsQuery,
): Promise<{ items: ReviewRecord[]; total: number }> {
  const filter = reviewSearchFilter(query)
  const limit = query.limit
  const offset = (query.page - 1) * query.limit
  const [idRows, countRows] = await Promise.all([
    prisma.$queryRaw<{ id: string }[]>`
      SELECT r.id
      FROM reviews r
      LEFT JOIN users u ON u.id = r."authorId"
      LEFT JOIN profiles p ON p."userId" = u.id
      WHERE ${filter}
      ORDER BY r."createdAt" DESC
      LIMIT ${limit} OFFSET ${offset}
    `,
    prisma.$queryRaw<{ total: number }[]>`
      SELECT COUNT(*)::int AS total
      FROM reviews r
      LEFT JOIN users u ON u.id = r."authorId"
      LEFT JOIN profiles p ON p."userId" = u.id
      WHERE ${filter}
    `,
  ])
  const ids = idRows.map((row) => row.id)
  if (ids.length === 0) return { items: [], total: Number(countRows[0]?.total ?? 0) }
  const rows = await prisma.review.findMany({
    where: { id: { in: ids } },
    include: reviewInclude,
  })
  const byId = new Map(rows.map((row) => [row.id, row]))
  const ordered = ids.flatMap((id) => {
    const row = byId.get(id)
    return row ? [row] : []
  })
  return { items: await withNames(ordered), total: Number(countRows[0]?.total ?? 0) }
}

async function listReviews(
  query: ListReviewsQuery,
): Promise<{ items: ReviewRecord[]; total: number }> {
  if (query.q) return searchReviews(query)
  const where: Prisma.ReviewWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.targetType ? { targetType: query.targetType } : {}),
  }
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
}

export function createReviewsRepository(): ReviewsRepository {
  return {
    async findMany(query) {
      return listReviews(query)
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
        const provider = await prisma.provider.findUnique({
          where: { id: targetId },
          select: { id: true },
        })
        return provider ? 'ok' : 'missing'
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
      const rows = await prisma.user.findMany({
        where: { role: 'WORKER' },
        orderBy: { email: 'asc' },
        take: 100,
        select: {
          id: true,
          email: true,
          profile: { select: { displayName: true, firstName: true, lastName: true } },
        },
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
