import type { AuthActor } from '../../authz/index.js'
import { conflict, notFound, validationError } from '../../errors/app-error.js'
import { findPlatformCategory } from '../categories/categories.access.js'
import type { FilesService } from '../files/files.service.js'
import type { InputTypesService } from '../input-types/index.js'
import { findListingSnapshot } from '../listings/listings.access.js'
import type { ProjectsService } from '../projects/projects.service.js'
import { allocateOrderedWithActiveType } from '../steps/steps.order.js'
import {
  MAX_PROJECT_STEP_INPUTS,
  MAX_PROJECT_STEPS,
  type ProjectSteppersRepository,
} from './project-steppers.repository.js'
import type {
  CreateProjectStepInputBody,
  FileSnapshotPayload,
  StepperInputValuePayload,
  UpsertStepperValuesBody,
} from './project-steppers.schema.js'
import type {
  ProjectStepDetail,
  ProjectStepInputField,
  ProjectStepNode,
} from './project-steppers.types.js'
import {
  assertListingMatchesCategory,
  assertValidStepperValue,
  fileIdFromValue,
  listingIdFromValue,
} from './project-steppers.values.js'

export type ProjectSteppersFilesGateway = Pick<
  FilesService,
  'requireReadyAttachment' | 'softDelete'
>

async function softDeleteFileBestEffort(
  files: ProjectSteppersFilesGateway,
  actor: AuthActor,
  fileId: string | null,
) {
  if (!fileId) return
  try {
    await files.softDelete(actor, fileId)
  } catch {
    // Best-effort cleanup — do not fail the primary write.
  }
}

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

async function assertCategoryBinding(inputTypeCode: string, categoryId: string | null | undefined) {
  const isCategory = inputTypeCode.toUpperCase() === 'CATEGORY'
  if (isCategory) {
    if (!categoryId) {
      throw validationError('Category is required for CATEGORY inputs')
    }
    const category = await findPlatformCategory(categoryId)
    if (!category || category.scope !== 'PLATFORM') {
      throw notFound('Category not found', 'CATEGORY_NOT_FOUND')
    }
    return categoryId
  }
  if (categoryId) {
    throw validationError('categoryId is only allowed for CATEGORY inputs')
  }
  return null
}

function toFileSnapshot(file: {
  id: string
  originalName: string
  mime: string
  size: number | null
}): FileSnapshotPayload {
  return {
    id: file.id,
    originalName: file.originalName,
    mime: file.mime,
    size: file.size,
  }
}

export function createProjectSteppersService(
  repository: ProjectSteppersRepository,
  projectsService: Pick<ProjectsService, 'assertAccessible'>,
  inputTypes: Pick<InputTypesService, 'requireActiveInputType'>,
  files: ProjectSteppersFilesGateway,
): ProjectSteppersService {
  async function resolveStoredValue(
    projectId: string,
    inputTypeCode: string,
    label: string,
    categoryId: string | null,
    value: StepperInputValuePayload,
  ): Promise<StepperInputValuePayload> {
    assertValidStepperValue(inputTypeCode, label, value)
    if (value === null) return null

    const code = inputTypeCode.toUpperCase()

    if (code === 'FILE') {
      const fileId = fileIdFromValue(value)
      if (!fileId) {
        throw validationError(`"${label}" must be a file selection`)
      }
      const file = await files.requireReadyAttachment(fileId, 'PROJECT', projectId)
      return toFileSnapshot(file)
    }

    if (code !== 'CATEGORY') {
      return value
    }

    const listingId = listingIdFromValue(value)
    if (!listingId) {
      throw validationError(`"${label}" must be a listing selection`)
    }
    const snapshot = await findListingSnapshot(listingId)
    if (!snapshot) {
      throw notFound('Listing not found', 'LISTING_NOT_FOUND')
    }
    assertListingMatchesCategory(label, snapshot, categoryId)
    return snapshot
  }

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

      const resolved: Array<{ id: string; value: StepperInputValuePayload }> = []
      const obsoleteFileIds: string[] = []
      for (const entry of body.values) {
        const field = byId.get(entry.id)
        if (!field) {
          throw validationError('One or more inputs do not belong to this project step')
        }
        const value = await resolveStoredValue(
          projectId,
          field.inputTypeCode,
          field.label,
          field.categoryId,
          entry.value,
        )
        if (field.inputTypeCode.toUpperCase() === 'FILE') {
          const previousFileId = fileIdFromValue(field.value)
          const nextFileId = fileIdFromValue(value)
          if (previousFileId && previousFileId !== nextFileId) {
            obsoleteFileIds.push(previousFileId)
          }
        }
        resolved.push({ id: entry.id, value })
      }

      await repository.upsertValues(link.id, resolved)
      for (const fileId of obsoleteFileIds) {
        await softDeleteFileBestEffort(files, actor, fileId)
      }
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
        persist: async (orderNb, inputType) => {
          const categoryId = await assertCategoryBinding(inputType.code, body.categoryId)
          let value: StepperInputValuePayload | undefined = body.value
          if (value !== undefined) {
            value = await resolveStoredValue(
              projectId,
              inputType.code,
              body.label,
              categoryId,
              value ?? null,
            )
          }
          return repository.createInput(projectStepId, {
            ...body,
            orderNb,
            inputTypeCode: inputType.code,
            inputTypeLabel: inputType.label,
            categoryId,
            value,
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
      // Project copies are independent of step templates — both cloned and
      // project-only inputs may be removed from this project without affecting templates.
      const attachedFileId =
        field.inputTypeCode.toUpperCase() === 'FILE' ? fileIdFromValue(field.value) : null
      await repository.deleteInput(inputId, projectStepId)
      await softDeleteFileBestEffort(files, actor, attachedFileId)
    },
  }
}
