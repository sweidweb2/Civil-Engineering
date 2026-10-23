import type { AuthActor } from '../../authz/index.js'
import { conflict, forbidden, notFound, validationError } from '../../errors/app-error.js'
import type { InputTypesService } from '../input-types/index.js'
import type { ProjectsService } from '../projects/projects.service.js'
import { allocateOrderedWithActiveType } from '../steps/steps.order.js'
import {
  MAX_PROJECT_STEP_INPUTS,
  MAX_PROJECT_STEPS,
  type ProjectSteppersRepository,
} from './project-steppers.repository.js'
import type {
  CreateProjectStepInputBody,
  UpsertStepperValuesBody,
} from './project-steppers.schema.js'
import type {
  ProjectStepDetail,
  ProjectStepInputField,
  ProjectStepNode,
} from './project-steppers.types.js'
import { assertValidStepperValue } from './project-steppers.values.js'

export type ProjectSteppersService = {
  listSteppers: (projectId: string, actor: AuthActor) => Promise<ProjectStepNode[]>
  getStepper: (
    projectId: string,
    projectStepId: string,
    actor: AuthActor,
  ) => Promise<ProjectStepDetail>
  saveValues: (
    projectId: string,
    projectStepId: string,
    body: UpsertStepperValuesBody,
    actor: AuthActor,
  ) => Promise<ProjectStepDetail>
  addInput: (
    projectId: string,
    projectStepId: string,
    body: CreateProjectStepInputBody,
    actor: AuthActor,
  ) => Promise<{ data: ProjectStepInputField; meta?: { orderAdjusted: boolean; orderNb: number } }>
  removeInput: (
    projectId: string,
    projectStepId: string,
    inputId: string,
    actor: AuthActor,
  ) => Promise<void>
}

function assertNotTruncated(truncated: boolean, kind: 'steps' | 'inputs') {
  if (!truncated) return
  if (kind === 'steps') {
    throw conflict(
      `This project exceeds the maximum of ${MAX_PROJECT_STEPS} steppers`,
      'PROJECT_STEPPERS_LIMIT',
    )
  }
  throw conflict(
    `This project step exceeds the maximum of ${MAX_PROJECT_STEP_INPUTS} inputs`,
    'PROJECT_STEP_INPUTS_LIMIT',
  )
}

export function createProjectSteppersService(
  repository: ProjectSteppersRepository,
  projectsService: Pick<ProjectsService, 'assertAccessible'>,
  inputTypes: Pick<InputTypesService, 'requireActiveInputType'>,
): ProjectSteppersService {
  async function loadOwnedStep(projectId: string, projectStepId: string, actor: AuthActor) {
    await projectsService.assertAccessible(projectId, actor)
    const link = await repository.findById(projectStepId)
    if (!link || link.projectId !== projectId) {
      throw notFound('Project step not found', 'PROJECT_STEPPER_NOT_FOUND')
    }
    return link
  }

  async function loadDetailOrThrow(projectStepId: string) {
    const { detail, truncated } = await repository.getDetail(projectStepId)
    if (!detail) throw notFound('Project step not found', 'PROJECT_STEPPER_NOT_FOUND')
    assertNotTruncated(truncated, 'inputs')
    return detail
  }

  return {
    async listSteppers(projectId, actor) {
      await projectsService.assertAccessible(projectId, actor)
      const { items, truncated } = await repository.listByProject(projectId)
      assertNotTruncated(truncated, 'steps')
      return items
    },

    async getStepper(projectId, projectStepId, actor) {
      await loadOwnedStep(projectId, projectStepId, actor)
      return loadDetailOrThrow(projectStepId)
    },

    async saveValues(projectId, projectStepId, body, actor) {
      const link = await loadOwnedStep(projectId, projectStepId, actor)
      const { items: meta, truncated } = await repository.listInputMeta(link.id)
      assertNotTruncated(truncated, 'inputs')
      const byId = new Map(meta.map((input) => [input.id, input]))

      for (const entry of body.values) {
        const field = byId.get(entry.id)
        if (!field) {
          throw validationError('One or more inputs do not belong to this project step')
        }
        assertValidStepperValue(field.inputTypeCode, field.label, entry.value)
      }

      await repository.upsertValues(link.id, body.values)
      return loadDetailOrThrow(projectStepId)
    },

    async addInput(projectId, projectStepId, body, actor) {
      await loadOwnedStep(projectId, projectStepId, actor)
      const inputCount = await repository.countInputs(projectStepId)
      if (inputCount >= MAX_PROJECT_STEP_INPUTS) {
        assertNotTruncated(true, 'inputs')
      }

      return allocateOrderedWithActiveType({
        requireActiveInputType: (id) => inputTypes.requireActiveInputType(id),
        inputTypeId: body.inputTypeId,
        listUsed: () => repository.listUsedOrders(projectStepId),
        requested: body.orderNb,
        persist: (orderNb, inputType) => {
          if (body.value !== undefined) {
            assertValidStepperValue(inputType.code, body.label, body.value ?? null)
          }
          return repository.createInput(projectStepId, {
            ...body,
            orderNb,
            inputTypeCode: inputType.code,
            inputTypeLabel: inputType.label,
          })
        },
        conflictMessage: 'Could not allocate a free input order. Retry.',
        conflictCode: 'PROJECT_STEP_INPUT_ORDER_CONFLICT',
      })
    },

    async removeInput(projectId, projectStepId, inputId, actor) {
      await loadOwnedStep(projectId, projectStepId, actor)
      const field = await repository.findInput(inputId, projectStepId)
      if (!field) {
        throw notFound('Project step input not found', 'PROJECT_STEP_INPUT_NOT_FOUND')
      }
      if (!field.isProjectOnly) {
        throw forbidden(
          'Template-cloned inputs cannot be deleted from a project',
          'PROJECT_STEP_INPUT_LOCKED',
        )
      }
      await repository.deleteInput(inputId, projectStepId)
    },
  }
}
