import type { StepperInputValuePayload } from './project-steppers.schema.js'

/**
 * Project-owned step instance (Prisma model: `StepperProject` / table `stepper_project`).
 * Not a `Project` row — a cloned step attached to one project.
 */
export type ProjectStepNode = {
  id: string
  projectId: string
  name: string
  orderNb: number
  inputCount: number
  filledCount: number
  /** True when every input has a non-null value (empty steps count as complete). */
  isComplete: boolean
}

/** @deprecated Prefer `ProjectStepNode`. */
export type ProjectStepperNode = ProjectStepNode

export type ProjectStepInputField = {
  id: string
  label: string
  orderNb: number
  inputTypeId: string
  inputTypeCode: string
  inputTypeLabel: string
  categoryId: string | null
  value: StepperInputValuePayload
  isProjectOnly: boolean
}

/** @deprecated Prefer `ProjectStepInputField`. */
export type ProjectStepperInputField = ProjectStepInputField

export type ProjectStepDetail = {
  id: string
  projectId: string
  name: string
  orderNb: number
  inputs: ProjectStepInputField[]
}

/** @deprecated Prefer `ProjectStepDetail`. */
export type ProjectStepperDetail = ProjectStepDetail
