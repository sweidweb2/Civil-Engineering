import type { AuthActor } from '../../authz/index.js'
import { hasAnyRole } from '../../authz/index.js'
import { forbidden, notFound } from '../../errors/app-error.js'
import type { RoleName } from '../auth/auth.schema.js'
import { allocateOrdered } from './steps.order.js'
import { type StepsRepository, toStepDto } from './steps.repository.js'
import type { CreateStepBody, ListStepsQuery, UpdateStepBody } from './steps.schema.js'
import type { PaginatedSteps, Step, StepMutationResult } from './steps.types.js'

/** Roles that may manage their own step templates. */
export const STEP_MANAGER_ROLES: readonly RoleName[] = ['SUPER', 'ADMIN', 'MANAGER'] as const

export type StepsService = {
  listSteps: (query: ListStepsQuery, actor: AuthActor) => Promise<PaginatedSteps>
  getStepById: (id: string, actor: AuthActor) => Promise<Step>
  createStep: (input: CreateStepBody, actor: AuthActor) => Promise<StepMutationResult>
  updateStep: (id: string, input: UpdateStepBody, actor: AuthActor) => Promise<StepMutationResult>
  deleteStep: (id: string, actor: AuthActor) => Promise<void>
}

function assertCanManageSteps(actor: AuthActor) {
  if (!hasAnyRole(actor.roles, STEP_MANAGER_ROLES)) {
    throw forbidden('Only admins and project managers can manage steps')
  }
}

export function createStepsService(repository: StepsRepository): StepsService {
  async function loadOwnOrThrow(id: string, actor: AuthActor) {
    const step = await repository.findById(id)
    if (!step || step.userId !== actor.id) {
      throw notFound('Step not found', 'STEP_NOT_FOUND')
    }
    return step
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
      await repository.delete(id)
    },
  }
}
