import { Prisma } from '../../generated/prisma/client.js'

import type { AuthActor } from '../../authz/index.js'
import { hasAnyRole } from '../../authz/index.js'
import { conflict, forbidden, notFound, validationError } from '../../errors/app-error.js'
import type { RoleName } from '../auth/auth.schema.js'
import { resolveOrderNb } from './steps.order.js'
import { toStepDto, toStepInputDto, type StepsRepository } from './steps.repository.js'
import type {
  CreateStepBody,
  CreateStepInputBody,
  ListStepsQuery,
  UpdateStepBody,
  UpdateStepInputBody,
} from './steps.schema.js'
import type {
  PaginatedSteps,
  Step,
  StepInput,
  StepInputMutationResult,
  StepMutationResult,
} from './steps.types.js'

/** Roles that may manage their own step templates. */
export const STEP_MANAGER_ROLES: readonly RoleName[] = ['SUPER', 'ADMIN', 'MANAGER'] as const

export type StepsService = {
  listSteps: (query: ListStepsQuery, actor: AuthActor) => Promise<PaginatedSteps>
  getStepById: (id: string, actor: AuthActor) => Promise<Step>
  createStep: (input: CreateStepBody, actor: AuthActor) => Promise<StepMutationResult>
  updateStep: (id: string, input: UpdateStepBody, actor: AuthActor) => Promise<StepMutationResult>
  deleteStep: (id: string, actor: AuthActor) => Promise<void>
  /** Assign the owner's ACTIVE step templates onto a newly created project. */
  assignActiveToProject: (projectId: string, ownerId: string) => Promise<void>
  listStepInputs: (stepId: string, actor: AuthActor) => Promise<StepInput[]>
  createStepInput: (
    stepId: string,
    input: CreateStepInputBody,
    actor: AuthActor,
  ) => Promise<StepInputMutationResult>
  updateStepInput: (
    stepId: string,
    inputId: string,
    input: UpdateStepInputBody,
    actor: AuthActor,
  ) => Promise<StepInputMutationResult>
  deleteStepInput: (stepId: string, inputId: string, actor: AuthActor) => Promise<void>
}

function assertCanManageSteps(actor: AuthActor) {
  if (!hasAnyRole(actor.roles, STEP_MANAGER_ROLES)) {
    throw forbidden('Only admins and project managers can manage steps')
  }
}

function orderMeta(orderNb: number, orderAdjusted: boolean) {
  return orderAdjusted ? { orderAdjusted: true, orderNb } : undefined
}

function isUniqueOrderConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

export function createStepsService(repository: StepsRepository): StepsService {
  async function loadOwnOrThrow(id: string, actor: AuthActor) {
    const step = await repository.findById(id)
    if (!step || step.userId !== actor.id) {
      throw notFound('Step not found', 'STEP_NOT_FOUND')
    }
    return step
  }

  async function assertActiveInputType(inputTypeId: string) {
    const inputType = await repository.findActiveInputType(inputTypeId)
    if (!inputType) {
      throw validationError('Select an active input type')
    }
  }

  async function loadOwnInputOrThrow(stepId: string, inputId: string, actor: AuthActor) {
    await loadOwnOrThrow(stepId, actor)
    const input = await repository.findInputById(inputId)
    if (!input || input.stepId !== stepId) {
      throw notFound('Step input not found', 'STEP_INPUT_NOT_FOUND')
    }
    return input
  }

  return {
    async listSteps(query, actor) {
      assertCanManageSteps(actor)
      const [{ items, total }, counts] = await Promise.all([
        repository.findMany(actor.id, query),
        repository.countByStatus(actor.id),
      ])
      return {
        data: items.map(toStepDto),
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          activeCount: counts.activeCount,
          inactiveCount: counts.inactiveCount,
          archivedCount: counts.archivedCount,
        },
      }
    },

    async getStepById(id, actor) {
      assertCanManageSteps(actor)
      return toStepDto(await loadOwnOrThrow(id, actor))
    },

    async createStep(input, actor) {
      assertCanManageSteps(actor)
      let requested = input.orderNb
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const used = await repository.listUsedStepOrders(actor.id)
        const { orderNb, orderAdjusted } = resolveOrderNb(used, requested)
        try {
          const created = await repository.create(actor.id, { ...input, orderNb })
          return { data: toStepDto(created), meta: orderMeta(orderNb, orderAdjusted || attempt > 0) }
        } catch (error) {
          if (!isUniqueOrderConflict(error)) throw error
          requested = undefined
        }
      }
      throw conflict('Could not allocate a free step order. Retry.', 'STEP_ORDER_CONFLICT')
    },

    async updateStep(id, input, actor) {
      assertCanManageSteps(actor)
      await loadOwnOrThrow(id, actor)
      if (input.orderNb === undefined) {
        const updated = await repository.update(id, input)
        return { data: toStepDto(updated) }
      }
      let requested: number | undefined = input.orderNb
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const used = await repository.listUsedStepOrders(actor.id, id)
        const { orderNb, orderAdjusted } = resolveOrderNb(used, requested)
        try {
          const updated = await repository.update(id, { ...input, orderNb })
          return {
            data: toStepDto(updated),
            meta: orderMeta(orderNb, orderAdjusted || attempt > 0),
          }
        } catch (error) {
          if (!isUniqueOrderConflict(error)) throw error
          requested = undefined
        }
      }
      throw conflict('Could not allocate a free step order. Retry.', 'STEP_ORDER_CONFLICT')
    },

    async deleteStep(id, actor) {
      assertCanManageSteps(actor)
      await loadOwnOrThrow(id, actor)
      // Templates are independent of project clones — hard delete is allowed.
      await repository.delete(id)
    },

    async assignActiveToProject(projectId, ownerId) {
      await repository.assignActiveToProject(projectId, ownerId)
    },

    async listStepInputs(stepId, actor) {
      assertCanManageSteps(actor)
      await loadOwnOrThrow(stepId, actor)
      const items = await repository.listInputs(stepId)
      return items.map(toStepInputDto)
    },

    async createStepInput(stepId, input, actor) {
      assertCanManageSteps(actor)
      await loadOwnOrThrow(stepId, actor)
      await assertActiveInputType(input.inputTypeId)
      let requested = input.orderNb
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const used = await repository.listUsedInputOrders(stepId)
        const { orderNb, orderAdjusted } = resolveOrderNb(used, requested)
        try {
          const created = await repository.createInput(stepId, { ...input, orderNb })
          return {
            data: toStepInputDto(created),
            meta: orderMeta(orderNb, orderAdjusted || attempt > 0),
          }
        } catch (error) {
          if (!isUniqueOrderConflict(error)) throw error
          requested = undefined
        }
      }
      throw conflict('Could not allocate a free input order. Retry.', 'STEP_INPUT_ORDER_CONFLICT')
    },

    async updateStepInput(stepId, inputId, input, actor) {
      assertCanManageSteps(actor)
      const current = await loadOwnInputOrThrow(stepId, inputId, actor)
      if (input.inputTypeId && input.inputTypeId !== current.inputTypeId) {
        await assertActiveInputType(input.inputTypeId)
      }
      if (input.orderNb === undefined) {
        const updated = await repository.updateInput(inputId, input)
        return { data: toStepInputDto(updated) }
      }

      let requested: number | undefined = input.orderNb
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const used = await repository.listUsedInputOrders(stepId, inputId)
        const { orderNb, orderAdjusted } = resolveOrderNb(used, requested)
        try {
          const updated = await repository.updateInput(inputId, { ...input, orderNb })
          return {
            data: toStepInputDto(updated),
            meta: orderMeta(orderNb, orderAdjusted || attempt > 0),
          }
        } catch (error) {
          if (!isUniqueOrderConflict(error)) throw error
          requested = undefined
        }
      }
      throw conflict('Could not allocate a free input order. Retry.', 'STEP_INPUT_ORDER_CONFLICT')
    },

    async deleteStepInput(stepId, inputId, actor) {
      assertCanManageSteps(actor)
      await loadOwnInputOrThrow(stepId, inputId, actor)
      // Template inputs are safe to delete: projects keep cloned project_step_inputs.
      await repository.deleteInput(inputId)
    },
  }
}
