import { Prisma } from '../../generated/prisma/client.js'
import { prisma } from '../../database/prisma.js'
import type { StepStatus as PrismaStepStatus } from '../../generated/prisma/client.js'
import type {
  CreateStepBody,
  CreateStepInputBody,
  ListStepsQuery,
  UpdateStepBody,
  UpdateStepInputBody,
} from './steps.schema.js'
import type { Step, StepInput } from './steps.types.js'

const stepInclude = {
  _count: { select: { inputs: true } },
} as const

const stepInputInclude = {
  inputType: { select: { code: true, label: true, status: true } },
} as const

export type StepRecord = {
  id: string
  name: string
  orderNb: number
  status: PrismaStepStatus
  userId: string
  inputCount: number
  createdAt: Date
  updatedAt: Date
}

export type StepInputRecord = {
  id: string
  stepId: string
  inputTypeId: string
  inputTypeCode: string
  inputTypeLabel: string
  label: string
  orderNb: number
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
  create: (
    userId: string,
    input: CreateStepBody & { orderNb: number },
  ) => Promise<StepRecord>
  update: (id: string, input: UpdateStepBody & { orderNb?: number }) => Promise<StepRecord>
  delete: (id: string) => Promise<void>
  assignActiveToProject: (projectId: string, userId: string) => Promise<number>
  listInputs: (stepId: string) => Promise<StepInputRecord[]>
  findInputById: (id: string) => Promise<StepInputRecord | null>
  listUsedInputOrders: (stepId: string, exceptId?: string) => Promise<number[]>
  findActiveInputType: (id: string) => Promise<{ id: string } | null>
  createInput: (
    stepId: string,
    input: CreateStepInputBody & { orderNb: number },
  ) => Promise<StepInputRecord>
  updateInput: (id: string, input: UpdateStepInputBody) => Promise<StepInputRecord>
  deleteInput: (id: string) => Promise<void>
}

function toStepRecord(row: {
  id: string
  name: string
  orderNb: number
  status: PrismaStepStatus
  userId: string
  createdAt: Date
  updatedAt: Date
  _count: { inputs: number }
}): StepRecord {
  return {
    id: row.id,
    name: row.name,
    orderNb: row.orderNb,
    status: row.status,
    userId: row.userId,
    inputCount: row._count.inputs,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function toStepInputRecord(row: {
  id: string
  stepId: string
  inputTypeId: string
  label: string
  orderNb: number
  createdAt: Date
  updatedAt: Date
  inputType: { code: string; label: string }
}): StepInputRecord {
  return {
    id: row.id,
    stepId: row.stepId,
    inputTypeId: row.inputTypeId,
    inputTypeCode: row.inputType.code,
    inputTypeLabel: row.inputType.label,
    label: row.label,
    orderNb: row.orderNb,
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
    inputCount: record.inputCount,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

export function toStepInputDto(record: StepInputRecord): StepInput {
  return {
    id: record.id,
    stepId: record.stepId,
    inputTypeId: record.inputTypeId,
    inputTypeCode: record.inputTypeCode,
    inputTypeLabel: record.inputTypeLabel,
    label: record.label,
    orderNb: record.orderNb,
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
        ...(query.q
          ? { name: { contains: query.q, mode: 'insensitive' as const } }
          : {}),
      }
      const skip = (query.page - 1) * query.limit
      const [rows, total] = await Promise.all([
        prisma.step.findMany({
          where,
          orderBy: [{ orderNb: 'asc' }, { name: 'asc' }],
          skip,
          take: query.limit,
          include: stepInclude,
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
      const row = await prisma.step.findUnique({ where: { id }, include: stepInclude })
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
      const row = await prisma.step.create({
        data: {
          name: input.name,
          orderNb: input.orderNb,
          status: input.status ?? 'ACTIVE',
          userId,
        },
        include: stepInclude,
      })
      return toStepRecord(row)
    },

    async update(id, input) {
      const row = await prisma.step.update({
        where: { id },
        data: {
          name: input.name,
          orderNb: input.orderNb,
          status: input.status,
        },
        include: stepInclude,
      })
      return toStepRecord(row)
    },

    async delete(id) {
      await prisma.step.delete({ where: { id } })
    },

    async assignActiveToProject(projectId, userId) {
      return prisma.$transaction(async (tx) => {
        const templates = await tx.step.findMany({
          where: { userId, status: 'ACTIVE' },
          orderBy: [{ orderNb: 'asc' }, { name: 'asc' }],
          include: {
            inputs: {
              orderBy: [{ orderNb: 'asc' }, { label: 'asc' }],
              include: {
                inputType: { select: { code: true, label: true } },
              },
            },
          },
        })
        if (templates.length === 0) return 0

        for (const template of templates) {
          const link = await tx.stepperProject.create({
            data: {
              projectId,
              name: template.name,
              orderNb: template.orderNb,
            },
          })
          if (template.inputs.length === 0) continue
          await tx.projectStepInput.createMany({
            data: template.inputs.map((input) => ({
              stepperProjectId: link.id,
              inputTypeId: input.inputTypeId,
              inputTypeCode: input.inputType.code,
              inputTypeLabel: input.inputType.label,
              label: input.label,
              orderNb: input.orderNb,
              value: Prisma.DbNull,
              isProjectOnly: false,
            })),
          })
        }
        return templates.length
      })
    },

    async listInputs(stepId) {
      const rows = await prisma.stepInput.findMany({
        where: { stepId },
        orderBy: [{ orderNb: 'asc' }, { label: 'asc' }],
        include: stepInputInclude,
      })
      return rows.map(toStepInputRecord)
    },

    async findInputById(id) {
      const row = await prisma.stepInput.findUnique({
        where: { id },
        include: stepInputInclude,
      })
      return row ? toStepInputRecord(row) : null
    },

    async listUsedInputOrders(stepId, exceptId) {
      const rows = await prisma.stepInput.findMany({
        where: {
          stepId,
          ...(exceptId ? { id: { not: exceptId } } : {}),
        },
        select: { orderNb: true },
      })
      return rows.map((row) => row.orderNb)
    },

    async findActiveInputType(id) {
      return prisma.inputType.findFirst({
        where: { id, status: 'ACTIVE' },
        select: { id: true },
      })
    },

    async createInput(stepId, input) {
      const row = await prisma.stepInput.create({
        data: {
          stepId,
          inputTypeId: input.inputTypeId,
          label: input.label,
          orderNb: input.orderNb,
        },
        include: stepInputInclude,
      })
      return toStepInputRecord(row)
    },

    async updateInput(id, input) {
      const row = await prisma.stepInput.update({
        where: { id },
        data: {
          inputTypeId: input.inputTypeId,
          label: input.label,
          orderNb: input.orderNb,
        },
        include: stepInputInclude,
      })
      return toStepInputRecord(row)
    },

    async deleteInput(id) {
      await prisma.stepInput.delete({ where: { id } })
    },
  }
}
