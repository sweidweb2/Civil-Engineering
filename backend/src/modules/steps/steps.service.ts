import type { AuthActor } from '../../authz/index.js'
import { hasAnyRole } from '../../authz/index.js'
import type { DbClient } from '../../database/transaction.js'
import { forbidden, notFound } from '../../errors/app-error.js'
import type { RoleName } from '../auth/auth.schema.js'
import { assertCategoryBinding, type CategoriesService } from '../categories/index.js'
import type { InputTypesService } from '../input-types/index.js'
import { allocateOrdered, allocateOrderedWithActiveType } from './steps.order.js'
import { type StepsRepository, toStepDto, toStepInputDto } from './steps.repository.js'
import type {
  CreateStepBody,
  CreateStepInputBody,
  ListStepInputsQuery,
  ListStepsQuery,
  UpdateStepBody,
  UpdateStepInputBody,
} from './steps.schema.js'
import type {
  PaginatedStepInputs,
  PaginatedSteps,
  Step,
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
  assignActiveToProject: (projectId: string, ownerId: string, db?: DbClient) => Promise<void>
  listStepInputs: (
    stepId: string,
    query: ListStepInputsQuery,
    actor: AuthActor,
  ) => Promise<PaginatedStepInputs>
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

export function createStepsService(
  repository: StepsRepository,
  inputTypes: Pick<InputTypesService, 'requireActiveInputType'>,
  categories: Pick<CategoriesService, 'requirePlatformCategory'>,
): StepsService {
  async function loadOwnOrThrow(id: string, actor: AuthActor) {
    const step = await repository.findById(id)
    if (!step || step.userId !== actor.id) {
      throw notFound('Step not found', 'STEP_NOT_FOUND')
    }
    return step
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
      const result = await allocateOrdered({
        listUsed: () => repository.listUsedStepOrders(actor.id),
        requested: input.orderNb,
        persist: (orderNb) => repository.create(actor.id, { ...input, orderNb }),
        conflictMessage: 'Could not allocate a free step order. Retry.',
        conflictCode: 'STEP_ORDER_CONFLICT',
      })
      return { data: toStepDto(result.data), meta: result.meta }
    },

    async updateStep(id, input, actor) {
      assertCanManageSteps(actor)
      await loadOwnOrThrow(id, actor)
      if (input.orderNb === undefined) {
        const updated = await repository.update(id, input)
        return { data: toStepDto(updated) }
      }
      const result = await allocateOrdered({
        listUsed: () => repository.listUsedStepOrders(actor.id, id),
        requested: input.orderNb,
        persist: (orderNb) => repository.update(id, { ...input, orderNb }),
        conflictMessage: 'Could not allocate a free step order. Retry.',
        conflictCode: 'STEP_ORDER_CONFLICT',
      })
      return { data: toStepDto(result.data), meta: result.meta }
    },

    async deleteStep(id, actor) {
      assertCanManageSteps(actor)
      await loadOwnOrThrow(id, actor)
      // Templates are independent of project clones — hard delete is allowed.
      await repository.delete(id)
    },

    async assignActiveToProject(projectId, ownerId, db) {
      await repository.assignActiveToProject(projectId, ownerId, db)
    },

    async listStepInputs(stepId, query, actor) {
      assertCanManageSteps(actor)
      await loadOwnOrThrow(stepId, actor)
      const { items, total } = await repository.listInputs(stepId, query)
      return {
        data: items.map(toStepInputDto),
        meta: {
          page: query.page,
          limit: query.limit,
          total,
        },
      }
    },

    async createStepInput(stepId, input, actor) {
      assertCanManageSteps(actor)
      await loadOwnOrThrow(stepId, actor)
      const result = await allocateOrderedWithActiveType({
        requireActiveInputType: (id) => inputTypes.requireActiveInputType(id),
        inputTypeId: input.inputTypeId,
        listUsed: () => repository.listUsedInputOrders(stepId),
        requested: input.orderNb,
        persist: async (orderNb, inputType) => {
          const categoryId = await assertCategoryBinding(
            categories,
            inputType.code,
            input.categoryId,
          )
          return repository.createInput(stepId, { ...input, orderNb, categoryId })
        },
        conflictMessage: 'Could not allocate a free input order. Retry.',
        conflictCode: 'STEP_INPUT_ORDER_CONFLICT',
      })
      return { data: toStepInputDto(result.data), meta: result.meta }
    },

    async updateStepInput(stepId, inputId, input, actor) {
      assertCanManageSteps(actor)
      const current = await loadOwnInputOrThrow(stepId, inputId, actor)
      let nextCode = current.inputTypeCode
      if (input.inputTypeId && input.inputTypeId !== current.inputTypeId) {
        const nextType = await inputTypes.requireActiveInputType(input.inputTypeId)
        nextCode = nextType.code
      }
      const nextCategoryId = input.categoryId !== undefined ? input.categoryId : current.categoryId
      const categoryId = await assertCategoryBinding(categories, nextCode, nextCategoryId)
      const payload = { ...input, categoryId }

      if (input.orderNb === undefined) {
        const updated = await repository.updateInput(inputId, payload)
        return { data: toStepInputDto(updated) }
      }

      const result = await allocateOrdered({
        listUsed: () => repository.listUsedInputOrders(stepId, inputId),
        requested: input.orderNb,
        persist: (orderNb) => repository.updateInput(inputId, { ...payload, orderNb }),
        conflictMessage: 'Could not allocate a free input order. Retry.',
        conflictCode: 'STEP_INPUT_ORDER_CONFLICT',
      })
      return { data: toStepInputDto(result.data), meta: result.meta }
    },

    async deleteStepInput(stepId, inputId, actor) {
      assertCanManageSteps(actor)
      await loadOwnInputOrThrow(stepId, inputId, actor)
      // Template inputs are safe to delete: projects keep cloned project_step_inputs.
      await repository.deleteInput(inputId)
    },
  }
}
