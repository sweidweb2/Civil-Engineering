import { prisma } from '../../database/prisma.js'
import { translateUniqueConflict } from '../../database/unique-conflict.js'
import type { StepStatus as PrismaStepStatus } from '../../generated/prisma/client.js'
import type { CreateStepBody, ListStepsQuery, UpdateStepBody } from './steps.schema.js'
import type { Step } from './steps.types.js'

export type StepRecord = {
  id: string
  name: string
  orderNb: number
  status: PrismaStepStatus
  userId: string
  createdAt: Date
  updatedAt: Date
}

export type StepsRepository = {
  findMany: (
    userId: string,
    query: ListStepsQuery,
  ) => Promise<{ items: StepRecord[]; total: number }>
  countByStatus: (
    userId: string,
  ) => Promise<{ activeCount: number; inactiveCount: number; archivedCount: number }>
  findById: (id: string) => Promise<StepRecord | null>
  listUsedStepOrders: (userId: string, exceptId?: string) => Promise<number[]>
  create: (userId: string, input: CreateStepBody & { orderNb: number }) => Promise<StepRecord>
  update: (id: string, input: UpdateStepBody & { orderNb?: number }) => Promise<StepRecord>
  delete: (id: string) => Promise<void>
}

function toStepRecord(row: {
  id: string
  name: string
  orderNb: number
  status: PrismaStepStatus
  userId: string
  createdAt: Date
  updatedAt: Date
}): StepRecord {
  return {
    id: row.id,
    name: row.name,
    orderNb: row.orderNb,
    status: row.status,
    userId: row.userId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function toStepDto(record: StepRecord): Step {
  return {
    id: record.id,
    name: record.name,
    orderNb: record.orderNb,
    status: record.status,
    userId: record.userId,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

export function createStepsRepository(): StepsRepository {
  return {
    async findMany(userId, query) {
      const where = {
        userId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.q ? { name: { contains: query.q, mode: 'insensitive' as const } } : {}),
      }
      const skip = (query.page - 1) * query.limit
      const [rows, total] = await Promise.all([
        prisma.step.findMany({
          where,
          orderBy: [{ orderNb: 'asc' }, { name: 'asc' }],
          skip,
          take: query.limit,
        }),
        prisma.step.count({ where }),
      ])
      return { items: rows.map(toStepRecord), total }
    },

    async countByStatus(userId) {
      const groups = await prisma.step.groupBy({
        by: ['status'],
        where: { userId },
        _count: { _all: true },
      })
      let activeCount = 0
      let inactiveCount = 0
      let archivedCount = 0
      for (const group of groups) {
        if (group.status === 'ACTIVE') activeCount = group._count._all
        if (group.status === 'INACTIVE') inactiveCount = group._count._all
        if (group.status === 'ARCHIVED') archivedCount = group._count._all
      }
      return { activeCount, inactiveCount, archivedCount }
    },

    async findById(id) {
      const row = await prisma.step.findUnique({ where: { id } })
      return row ? toStepRecord(row) : null
    },

    async listUsedStepOrders(userId, exceptId) {
      const rows = await prisma.step.findMany({
        where: {
          userId,
          ...(exceptId ? { id: { not: exceptId } } : {}),
        },
        select: { orderNb: true },
      })
      return rows.map((row) => row.orderNb)
    },

    async create(userId, input) {
      const row = await translateUniqueConflict(() =>
        prisma.step.create({
          data: {
            name: input.name,
            orderNb: input.orderNb,
            status: input.status ?? 'ACTIVE',
            userId,
          },
        }),
      )
      return toStepRecord(row)
    },

    async update(id, input) {
      const row = await translateUniqueConflict(() =>
        prisma.step.update({
          where: { id },
          data: {
            name: input.name,
            orderNb: input.orderNb,
            status: input.status,
          },
        }),
      )
      return toStepRecord(row)
    },

    async delete(id) {
      await prisma.step.delete({ where: { id } })
    },
  }
}
