import { prisma } from '../../database/prisma.js'
import { Prisma } from '../../generated/prisma/client.js'
import type {
  CreateProjectStepInputBody,
  StepperInputValuePayload,
} from './project-steppers.schema.js'
import type {
  ProjectStepDetail,
  ProjectStepInputField,
  ProjectStepNode,
} from './project-steppers.types.js'

/** Soft caps — typical projects stay well below these. */
export const MAX_PROJECT_STEPS = 100
export const MAX_PROJECT_STEP_INPUTS = 200

export type ProjectStepInputMeta = {
  id: string
  label: string
  inputTypeCode: string
}

export type ProjectSteppersRepository = {
  listByProject: (projectId: string) => Promise<ProjectStepNode[]>
  findById: (id: string) => Promise<{ id: string; projectId: string } | null>
  getDetail: (projectStepId: string) => Promise<ProjectStepDetail | null>
  /** Lean fields needed to validate a values payload (no JSON values). */
  listInputMeta: (projectStepId: string) => Promise<ProjectStepInputMeta[]>
  findInputId: (id: string, projectStepId: string) => Promise<{ id: string } | null>
  upsertValues: (
    projectStepId: string,
    values: Array<{ id: string; value: StepperInputValuePayload }>,
  ) => Promise<void>
  listUsedOrders: (projectStepId: string) => Promise<number[]>
  createInput: (
    projectStepId: string,
    input: CreateProjectStepInputBody & {
      orderNb: number
      inputTypeCode: string
      inputTypeLabel: string
    },
  ) => Promise<ProjectStepInputField>
  deleteInput: (id: string, projectStepId: string) => Promise<void>
}

function asPayload(value: Prisma.JsonValue | null | undefined): StepperInputValuePayload {
  if (value === undefined || value === null) return null
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }
  return null
}

function toJsonInput(value: StepperInputValuePayload): Prisma.InputJsonValue | typeof Prisma.JsonNull {
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
    value: asPayload(row.value),
    isProjectOnly: row.isProjectOnly,
  }
}

export function createProjectSteppersRepository(): ProjectSteppersRepository {
  return {
    async listByProject(projectId) {
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
      if (rows.length === 0) return []

      const counts = await prisma.$queryRaw<
        Array<{ stepperProjectId: string; inputCount: number; filledCount: number }>
      >`
        SELECT
          "stepperProjectId",
          COUNT(*)::int AS "inputCount",
          COUNT(*) FILTER (WHERE value IS NOT NULL)::int AS "filledCount"
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

      return rows.map((row) => {
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
      })
    },

    async findById(id) {
      return prisma.stepperProject.findUnique({
        where: { id },
        select: { id: true, projectId: true },
      })
    },

    async getDetail(projectStepId) {
      const row = await prisma.stepperProject.findUnique({
        where: { id: projectStepId },
        include: {
          inputs: {
            orderBy: [{ orderNb: 'asc' }, { label: 'asc' }],
            take: MAX_PROJECT_STEP_INPUTS,
          },
        },
      })
      if (!row) return null

      return {
        id: row.id,
        projectId: row.projectId,
        name: row.name,
        orderNb: row.orderNb,
        inputs: row.inputs.map(toField),
      }
    },

    async listInputMeta(projectStepId) {
      return prisma.projectStepInput.findMany({
        where: { stepperProjectId: projectStepId },
        orderBy: [{ orderNb: 'asc' }, { label: 'asc' }],
        take: MAX_PROJECT_STEP_INPUTS,
        select: { id: true, label: true, inputTypeCode: true },
      })
    },

    async findInputId(id, projectStepId) {
      return prisma.projectStepInput.findFirst({
        where: { id, stepperProjectId: projectStepId },
        select: { id: true },
      })
    },

    async upsertValues(projectStepId, values) {
      if (values.length === 0) return
      await prisma.$transaction(async (tx) => {
        await Promise.all(
          values.map((entry) =>
            tx.projectStepInput.updateMany({
              where: { id: entry.id, stepperProjectId: projectStepId },
              data: { value: toJsonInput(entry.value) },
            }),
          ),
        )
      })
    },

    async listUsedOrders(projectStepId) {
      const rows = await prisma.projectStepInput.findMany({
        where: { stepperProjectId: projectStepId },
        select: { orderNb: true },
        take: MAX_PROJECT_STEP_INPUTS,
      })
      return rows.map((row) => row.orderNb)
    },

    async createInput(projectStepId, input) {
      const row = await prisma.projectStepInput.create({
        data: {
          stepperProjectId: projectStepId,
          inputTypeId: input.inputTypeId,
          inputTypeCode: input.inputTypeCode,
          inputTypeLabel: input.inputTypeLabel,
          label: input.label,
          orderNb: input.orderNb,
          value:
            input.value === undefined || input.value === null
              ? Prisma.DbNull
              : toJsonInput(input.value),
          isProjectOnly: true,
        },
      })
      return toField(row)
    },

    async deleteInput(id, projectStepId) {
      await prisma.projectStepInput.deleteMany({
        where: { id, stepperProjectId: projectStepId },
      })
    },
  }
}
