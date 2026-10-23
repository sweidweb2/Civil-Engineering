import { Prisma } from '../../generated/prisma/client.js'

import type { AuthActor } from '../../authz/index.js'
import { conflict, notFound, validationError } from '../../errors/app-error.js'
import type { ProjectsService } from '../projects/projects.service.js'
import { resolveOrderNb } from '../steps/steps.order.js'
import type { ProjectSteppersRepository } from './project-steppers.repository.js'
import type {
  CreateProjectStepInputBody,
  UpsertStepperValuesBody,
} from './project-steppers.schema.js'
import type {
  ProjectStepperDetail,
  ProjectStepperInputField,
  ProjectStepperNode,
} from './project-steppers.types.js'
import { assertValidStepperValue } from './project-steppers.values.js'

export type ProjectSteppersService = {
  listSteppers: (projectId: string, actor: AuthActor) => Promise<ProjectStepperNode[]>
  getStepper: (
    projectId: string,
    stepperProjectId: string,
    actor: AuthActor,
  ) => Promise<ProjectStepperDetail>
  saveValues: (
    projectId: string,
    stepperProjectId: string,
    body: UpsertStepperValuesBody,
    actor: AuthActor,
  ) => Promise<ProjectStepperDetail>
  addInput: (
    projectId: string,
    stepperProjectId: string,
    body: CreateProjectStepInputBody,
    actor: AuthActor,
  ) => Promise<{ data: ProjectStepperInputField; meta?: { orderAdjusted: boolean; orderNb: number } }>
  removeInput: (
    projectId: string,
    stepperProjectId: string,
    inputId: string,
    actor: AuthActor,
  ) => Promise<void>
}

function isUniqueOrderConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

export function createProjectSteppersService(
  repository: ProjectSteppersRepository,
  projectsService: Pick<ProjectsService, 'assertAccessible'>,
): ProjectSteppersService {
  async function loadOwnedStepper(projectId: string, stepperProjectId: string, actor: AuthActor) {
    await projectsService.assertAccessible(projectId, actor)
    const link = await repository.findById(stepperProjectId)
    if (!link || link.projectId !== projectId) {
      throw notFound('Project stepper not found', 'PROJECT_STEPPER_NOT_FOUND')
    }
    return link
  }

  async function loadDetailOrThrow(stepperProjectId: string) {
    const detail = await repository.getDetail(stepperProjectId)
    if (!detail) throw notFound('Project stepper not found', 'PROJECT_STEPPER_NOT_FOUND')
    return detail
  }

  return {
    async listSteppers(projectId, actor) {
      await projectsService.assertAccessible(projectId, actor)
      return repository.listByProject(projectId)
    },

    async getStepper(projectId, stepperProjectId, actor) {
      await loadOwnedStepper(projectId, stepperProjectId, actor)
      return loadDetailOrThrow(stepperProjectId)
    },

    async saveValues(projectId, stepperProjectId, body, actor) {
      const link = await loadOwnedStepper(projectId, stepperProjectId, actor)
      const detail = await loadDetailOrThrow(stepperProjectId)
      const byId = new Map(detail.inputs.map((input) => [input.id, input]))

      for (const entry of body.values) {
        const field = byId.get(entry.id)
        if (!field) {
          throw validationError('One or more inputs do not belong to this stepper')
        }
        assertValidStepperValue(field.inputTypeCode, field.label, entry.value)
      }

      await repository.upsertValues(link.id, body.values)
      return loadDetailOrThrow(stepperProjectId)
    },

    async addInput(projectId, stepperProjectId, body, actor) {
      await loadOwnedStepper(projectId, stepperProjectId, actor)
      await loadDetailOrThrow(stepperProjectId)

      const inputType = await repository.findActiveInputType(body.inputTypeId)
      if (!inputType) {
        throw validationError('Select an active input type')
      }
      if (body.value !== undefined) {
        assertValidStepperValue(inputType.code, body.label, body.value ?? null)
      }

      let requested = body.orderNb
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const used = await repository.listUsedOrders(stepperProjectId)
        const { orderNb, orderAdjusted } = resolveOrderNb(used, requested)
        try {
          const created = await repository.createInput(stepperProjectId, {
            ...body,
            orderNb,
            inputTypeCode: inputType.code,
            inputTypeLabel: inputType.label,
          })
          return {
            data: created,
            meta:
              orderAdjusted || attempt > 0
                ? { orderAdjusted: true, orderNb }
                : undefined,
          }
        } catch (error) {
          if (!isUniqueOrderConflict(error)) throw error
          requested = undefined
        }
      }
      throw conflict('Could not allocate a free input order. Retry.', 'PROJECT_STEP_INPUT_ORDER_CONFLICT')
    },

    async removeInput(projectId, stepperProjectId, inputId, actor) {
      await loadOwnedStepper(projectId, stepperProjectId, actor)
      const detail = await repository.getDetail(stepperProjectId)
      const field = detail?.inputs.find((input) => input.id === inputId)
      if (!field) {
        throw notFound('Project step input not found', 'PROJECT_STEP_INPUT_NOT_FOUND')
      }
      await repository.deleteInput(inputId, stepperProjectId)
    },
  }
}
