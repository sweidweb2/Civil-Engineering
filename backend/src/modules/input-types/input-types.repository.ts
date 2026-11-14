import { prisma } from '../../database/prisma.js'
import type { InputTypeStatus as PrismaInputTypeStatus } from '../../generated/prisma/client.js'
import type {
  CreateInputTypeBody,
  ListInputTypesQuery,
  UpdateInputTypeBody,
} from './input-types.schema.js'

const usageInclude = {
  _count: { select: { stepInputs: true, projectStepInputs: true } },
} as const

export type InputTypeRecord = {
  id: string
  code: string
  label: string
  status: PrismaInputTypeStatus
  sortOrder: number
  usageCount: number
  createdAt: Date
  updatedAt: Date
}

export type ActiveInputTypeRef = {
  id: string
  code: string
  label: string
}

export type InputTypesRepository = {
  findMany: (
    query: ListInputTypesQuery,
    options?: { includeUsage?: boolean },
  ) => Promise<{ items: InputTypeRecord[]; total: number }>
  countByStatus: () => Promise<{ activeCount: number; inactiveCount: number }>
  findById: (id: string) => Promise<InputTypeRecord | null>
  /** Lean lookup for other modules attaching fields to an ACTIVE catalog type. */
  findActiveById: (id: string) => Promise<ActiveInputTypeRef | null>
  findByCode: (code: string, exceptId?: string) => Promise<{ id: string } | null>
  create: (input: CreateInputTypeBody) => Promise<InputTypeRecord>
  update: (id: string, input: UpdateInputTypeBody) => Promise<InputTypeRecord>
  delete: (id: string) => Promise<void>
}

function toRecord(row: {
  id: string
  code: string
  label: string
  status: PrismaInputTypeStatus
  sortOrder: number
  createdAt: Date
  updatedAt: Date
  _count?: { stepInputs: number; projectStepInputs: number }
}): InputTypeRecord {
  return {
    id: row.id,
    code: row.code,
    label: row.label,
    status: row.status,
    sortOrder: row.sortOrder,
    usageCount: row._count ? row._count.stepInputs + row._count.projectStepInputs : 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function createInputTypesRepository(): InputTypesRepository {
  return {
    async findMany(query, options) {
      const includeUsage = options?.includeUsage === true
      const where = {
        ...(query.status ? { status: query.status } : {}),
        ...(query.q
          ? {
              OR: [
                { code: { contains: query.q, mode: 'insensitive' as const } },
                { label: { contains: query.q, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      }
      const skip = (query.page - 1) * query.limit
      const [rows, total] = await Promise.all([
        prisma.inputType.findMany({
          where,
          orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
          skip,
          take: query.limit,
          ...(includeUsage ? { include: usageInclude } : {}),
        }),
        prisma.inputType.count({ where }),
      ])
      return { items: rows.map(toRecord), total }
    },

    async countByStatus() {
      const groups = await prisma.inputType.groupBy({
        by: ['status'],
        _count: { _all: true },
      })
      let activeCount = 0
      let inactiveCount = 0
      for (const group of groups) {
        if (group.status === 'ACTIVE') activeCount = group._count._all
        if (group.status === 'INACTIVE') inactiveCount = group._count._all
      }
      return { activeCount, inactiveCount }
    },

    async findById(id) {
      const row = await prisma.inputType.findUnique({ where: { id }, include: usageInclude })
      return row ? toRecord(row) : null
    },

    async findActiveById(id) {
      return prisma.inputType.findFirst({
        where: { id, status: 'ACTIVE' },
        select: { id: true, code: true, label: true },
      })
    },

    async findByCode(code, exceptId) {
      return prisma.inputType.findFirst({
        where: {
          code: { equals: code, mode: 'insensitive' },
          ...(exceptId ? { id: { not: exceptId } } : {}),
        },
        select: { id: true },
      })
    },

    async create(input) {
      const row = await prisma.inputType.create({
        data: {
          code: input.code,
          label: input.label,
          status: input.status ?? 'ACTIVE',
          sortOrder: input.sortOrder ?? 0,
        },
        include: usageInclude,
      })
      return toRecord(row)
    },

    async update(id, input) {
      const row = await prisma.inputType.update({
        where: { id },
        data: {
          code: input.code,
          label: input.label,
          status: input.status,
          sortOrder: input.sortOrder,
        },
        include: usageInclude,
      })
      return toRecord(row)
    },

    async delete(id) {
      await prisma.inputType.delete({ where: { id } })
    },
  }
}
