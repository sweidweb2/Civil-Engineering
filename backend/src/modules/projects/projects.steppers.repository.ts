import { prisma } from '../../database/prisma.js'
import { translateUniqueConflict } from '../../database/unique-conflict.js'
import { Prisma } from '../../generated/prisma/client.js'
import {
  type CreateProjectStepInputBody,
  fileSnapshotSchema,
  listingSnapshotSchema,
  type StepperInputValuePayload,
} from './projects.steppers.schema.js'
import type {
  ProjectStepDetail,
  ProjectStepInputField,
  ProjectStepNode,
} from './projects.steppers.types.js'

/** Soft caps — typical projects stay well below these. */
export const MAX_PROJECT_STEPS = 100
export const MAX_PROJECT_STEP_INPUTS = 200

export type ProjectStepInputMeta = {
  id: string
  label: string
  inputTypeCode: string
  categoryId: string | null
  /** Current stored value — used to soft-delete replaced FILE attachments. */
  value: StepperInputValuePayload
}

export type ProjectSteppersRepository = {
  listByProject: (projectId: string) => Promise<{
    items: ProjectStepNode[]
    total: number
    truncated: boolean
  }>
  findById: (id: string) => Promise<{ id: string; projectId: string } | null>
  getDetail: (projectStepId: string) => Promise<{
    detail: ProjectStepDetail | null
    truncated: boolean
  }>
  /** Fields needed to validate a values payload + FILE cleanup. */
  listInputMeta: (projectStepId: string) => Promise<{
    items: ProjectStepInputMeta[]
    truncated: boolean
  }>
  findInput: (
    id: string,
    projectStepId: string,
  ) => Promise<{
    id: string
    isProjectOnly: boolean
    categoryId: string | null
    inputTypeCode: string
    value: StepperInputValuePayload
  } | null>
  upsertValues: (
    projectStepId: string,
    values: Array<{ id: string; value: StepperInputValuePayload }>,
  ) => Promise<void>
  listUsedOrders: (projectStepId: string) => Promise<number[]>
  countInputs: (projectStepId: string) => Promise<number>
  createInput: (
    projectStepId: string,
    input: CreateProjectStepInputBody & {
      orderNb: number
      inputTypeCode: string
      inputTypeLabel: string
      categoryId: string | null
    },
  ) => Promise<ProjectStepInputField>
  updateInput: (
    id: string,
    projectStepId: string,
    input: { label?: string; categoryId?: string | null; clearValue?: boolean },
  ) => Promise<ProjectStepInputField | null>
  deleteInput: (id: string, projectStepId: string) => Promise<void>
}

function asPayload(value: Prisma.JsonValue | null | undefined): StepperInputValuePayload {
  if (value === undefined || value === null) return null
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    const file = fileSnapshotSchema.safeParse(value)
    if (file.success) return file.data
    const listing = listingSnapshotSchema.safeParse(value)
    if (listing.success) return listing.data
  }
  return null
}

function toJsonInput(
  value: StepperInputValuePayload,
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value === null) return Prisma.JsonNull
  return value
}

function toField(row: {
  id: string
  label: string
  orderNb: number
  inputTypeId: string
  inputTypeCode: string
  inputTypeLabel: string
  categoryId: string | null
  value: Prisma.JsonValue | null
  isProjectOnly: boolean
}): ProjectStepInputField {
  return {
    id: row.id,
    label: row.label,
    orderNb: row.orderNb,
    inputTypeId: row.inputTypeId,
    inputTypeCode: row.inputTypeCode,
    inputTypeLabel: row.inputTypeLabel,
    categoryId: row.categoryId,
    value: asPayload(row.value),
    isProjectOnly: row.isProjectOnly,
  }
}

export function createProjectSteppersRepository(): ProjectSteppersRepository {
  return {
    async listByProject(projectId) {
      const total = await prisma.stepperProject.count({ where: { projectId } })
      const rows = await prisma.stepperProject.findMany({
        where: { projectId },
        orderBy: [{ orderNb: 'asc' }, { createdAt: 'asc' }],
        take: MAX_PROJECT_STEPS,
        select: {
          id: true,
          projectId: true,
          name: true,
          orderNb: true,
        },
      })
      if (rows.length === 0) {
        return { items: [], total, truncated: total > MAX_PROJECT_STEPS }
      }

      // Empty TEXT ("") must not count as filled; objects (CATEGORY snapshots) count as filled.
      const counts = await prisma.$queryRaw<
        Array<{ stepperProjectId: string; inputCount: number; filledCount: number }>
      >`
        SELECT
          "stepperProjectId",
          COUNT(*)::int AS "inputCount",
          COUNT(*) FILTER (
            WHERE value IS NOT NULL
              AND NOT (jsonb_typeof(value) = 'string' AND value #>> '{}' = '')
          )::int AS "filledCount"
        FROM project_step_inputs
        WHERE "stepperProjectId" IN (${Prisma.join(rows.map((row) => row.id))})
        GROUP BY "stepperProjectId"
      `

      const byId = new Map(
        counts.map((row) => [
          row.stepperProjectId,
          { inputCount: row.inputCount, filledCount: row.filledCount },
        ]),
      )

      return {
        items: rows.map((row) => {
          const stats = byId.get(row.id) ?? { inputCount: 0, filledCount: 0 }
          return {
            id: row.id,
            projectId: row.projectId,
            name: row.name,
            orderNb: row.orderNb,
            inputCount: stats.inputCount,
            filledCount: stats.filledCount,
            isComplete: stats.filledCount === stats.inputCount,
          }
        }),
        total,
        truncated: total > MAX_PROJECT_STEPS,
      }
    },

    async findById(id) {
      return prisma.stepperProject.findUnique({
        where: { id },
        select: { id: true, projectId: true },
      })
    },

    async getDetail(projectStepId) {
      const totalInputs = await prisma.projectStepInput.count({
        where: { stepperProjectId: projectStepId },
      })
      const row = await prisma.stepperProject.findUnique({
        where: { id: projectStepId },
        include: {
          inputs: {
            orderBy: [{ orderNb: 'asc' }, { label: 'asc' }],
            take: MAX_PROJECT_STEP_INPUTS,
          },
        },
      })
      if (!row) return { detail: null, truncated: false }

      return {
        detail: {
          id: row.id,
          projectId: row.projectId,
          name: row.name,
          orderNb: row.orderNb,
          inputs: row.inputs.map(toField),
        },
        truncated: totalInputs > MAX_PROJECT_STEP_INPUTS,
      }
    },

    async listInputMeta(projectStepId) {
      const total = await prisma.projectStepInput.count({
        where: { stepperProjectId: projectStepId },
      })
      const rows = await prisma.projectStepInput.findMany({
        where: { stepperProjectId: projectStepId },
        orderBy: [{ orderNb: 'asc' }, { label: 'asc' }],
        take: MAX_PROJECT_STEP_INPUTS,
        select: {
          id: true,
          label: true,
          inputTypeCode: true,
          categoryId: true,
          value: true,
        },
      })
      return {
        items: rows.map((row) => ({
          id: row.id,
          label: row.label,
          inputTypeCode: row.inputTypeCode,
          categoryId: row.categoryId,
          value: asPayload(row.value),
        })),
        truncated: total > MAX_PROJECT_STEP_INPUTS,
      }
    },

    async findInput(id, projectStepId) {
      const row = await prisma.projectStepInput.findFirst({
        where: { id, stepperProjectId: projectStepId },
        select: {
          id: true,
          isProjectOnly: true,
          categoryId: true,
          inputTypeCode: true,
          value: true,
        },
      })
      if (!row) return null
      return {
        id: row.id,
        isProjectOnly: row.isProjectOnly,
        categoryId: row.categoryId,
        inputTypeCode: row.inputTypeCode,
        value: asPayload(row.value),
      }
    },

    async upsertValues(projectStepId, values) {
      if (values.length === 0) return

      // Single statement instead of N updateMany calls.
      await prisma.$executeRaw`
        UPDATE project_step_inputs AS p
        SET
          value = data.value,
          "updatedAt" = NOW()
        FROM (
          VALUES ${Prisma.join(
            values.map((entry) => {
              if (entry.value === null) {
                return Prisma.sql`(${entry.id}::text, NULL::jsonb)`
              }
              return Prisma.sql`(${entry.id}::text, ${JSON.stringify(entry.value)}::jsonb)`
            }),
          )}
        ) AS data(id, value)
        WHERE p.id = data.id
          AND p."stepperProjectId" = ${projectStepId}
      `
    },

    async listUsedOrders(projectStepId) {
      const rows = await prisma.projectStepInput.findMany({
        where: { stepperProjectId: projectStepId },
        select: { orderNb: true },
        take: MAX_PROJECT_STEP_INPUTS,
      })
      return rows.map((row) => row.orderNb)
    },

    async countInputs(projectStepId) {
      return prisma.projectStepInput.count({
        where: { stepperProjectId: projectStepId },
      })
    },

    async createInput(projectStepId, input) {
      const row = await translateUniqueConflict(() =>
        prisma.projectStepInput.create({
          data: {
            stepperProjectId: projectStepId,
            inputTypeId: input.inputTypeId,
            inputTypeCode: input.inputTypeCode,
            inputTypeLabel: input.inputTypeLabel,
            label: input.label,
            orderNb: input.orderNb,
            categoryId: input.categoryId,
            value:
              input.value === undefined || input.value === null
                ? Prisma.DbNull
                : toJsonInput(input.value),
            isProjectOnly: true,
          },
        }),
      )
      return toField(row)
    },

    async updateInput(id, projectStepId, input) {
      const existing = await prisma.projectStepInput.findFirst({
        where: { id, stepperProjectId: projectStepId, isProjectOnly: true },
      })
      if (!existing) return null
      const row = await prisma.projectStepInput.update({
        where: { id },
        data: {
          ...(input.label !== undefined ? { label: input.label } : {}),
          ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
          ...(input.clearValue ? { value: Prisma.DbNull } : {}),
        },
      })
      return toField(row)
    },

    async deleteInput(id, projectStepId) {
      await prisma.projectStepInput.deleteMany({
        where: { id, stepperProjectId: projectStepId, isProjectOnly: true },
      })
    },
  }
}
