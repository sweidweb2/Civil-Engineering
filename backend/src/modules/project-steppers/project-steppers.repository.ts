import { Prisma } from '../../generated/prisma/client.js'
import { prisma } from '../../database/prisma.js'
import type {
  CreateProjectStepInputBody,
  StepperInputValuePayload,
} from './project-steppers.schema.js'
import type {
  ProjectStepperDetail,
  ProjectStepperInputField,
  ProjectStepperNode,
} from './project-steppers.types.js'

export type ProjectSteppersRepository = {
  listByProject: (projectId: string) => Promise<ProjectStepperNode[]>
  findById: (id: string) => Promise<{ id: string; projectId: string } | null>
  getDetail: (stepperProjectId: string) => Promise<ProjectStepperDetail | null>
  upsertValues: (
    stepperProjectId: string,
    values: Array<{ id: string; value: StepperInputValuePayload }>,
  ) => Promise<void>
  listUsedOrders: (stepperProjectId: string) => Promise<number[]>
  findActiveInputType: (
    id: string,
  ) => Promise<{ id: string; code: string; label: string } | null>
  createInput: (
    stepperProjectId: string,
    input: CreateProjectStepInputBody & {
      orderNb: number
      inputTypeCode: string
      inputTypeLabel: string
    },
  ) => Promise<ProjectStepperInputField>
  deleteInput: (id: string, stepperProjectId: string) => Promise<void>
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
}): ProjectStepperInputField {
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
        include: {
          inputs: { select: { value: true } },
        },
      })
      return rows.map((row) => {
        const inputCount = row.inputs.length
        const filledCount = row.inputs.filter((input) => input.value !== null).length
        return {
          id: row.id,
          projectId: row.projectId,
          name: row.name,
          orderNb: row.orderNb,
          inputCount,
          filledCount,
          isComplete: filledCount === inputCount,
        }
      })
    },

    async findById(id) {
      return prisma.stepperProject.findUnique({
        where: { id },
        select: { id: true, projectId: true },
      })
    },

    async getDetail(stepperProjectId) {
      const row = await prisma.stepperProject.findUnique({
        where: { id: stepperProjectId },
        include: {
          inputs: {
            orderBy: [{ orderNb: 'asc' }, { label: 'asc' }],
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

    async upsertValues(stepperProjectId, values) {
      await prisma.$transaction(
        values.map((entry) =>
          prisma.projectStepInput.updateMany({
            where: { id: entry.id, stepperProjectId },
            data: { value: toJsonInput(entry.value) },
          }),
        ),
      )
    },

    async listUsedOrders(stepperProjectId) {
      const rows = await prisma.projectStepInput.findMany({
        where: { stepperProjectId },
        select: { orderNb: true },
      })
      return rows.map((row) => row.orderNb)
    },

    async findActiveInputType(id) {
      return prisma.inputType.findFirst({
        where: { id, status: 'ACTIVE' },
        select: { id: true, code: true, label: true },
      })
    },

    async createInput(stepperProjectId, input) {
      const row = await prisma.projectStepInput.create({
        data: {
          stepperProjectId,
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

    async deleteInput(id, stepperProjectId) {
      await prisma.projectStepInput.deleteMany({
        where: { id, stepperProjectId },
      })
    },
  }
}
