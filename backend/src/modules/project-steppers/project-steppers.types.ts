import type { StepperInputValuePayload } from './project-steppers.schema.js'

export type ProjectStepperNode = {
  id: string
  projectId: string
  name: string
  orderNb: number
  inputCount: number
  filledCount: number
  /** True when every input has a non-null value (empty steppers count as complete). */
  isComplete: boolean
}

export type ProjectStepperInputField = {
  id: string
  label: string
  orderNb: number
  inputTypeId: string
  inputTypeCode: string
  inputTypeLabel: string
  value: StepperInputValuePayload
  isProjectOnly: boolean
}

export type ProjectStepperDetail = {
  id: string
  projectId: string
  name: string
  orderNb: number
  inputs: ProjectStepperInputField[]
}
