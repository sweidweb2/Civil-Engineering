import { apiRequest } from './api'

export type StepperValue = string | number | boolean | null

export type ProjectStepperNode = {
  id: string
  projectId: string
  name: string
  orderNb: number
  inputCount: number
  filledCount: number
  isComplete: boolean
}

export type ProjectStepperInputField = {
  id: string
  label: string
  orderNb: number
  inputTypeId: string
  inputTypeCode: string
  inputTypeLabel: string
  value: StepperValue
  isProjectOnly: boolean
}

export type ProjectStepperDetail = {
  id: string
  projectId: string
  name: string
  orderNb: number
  inputs: ProjectStepperInputField[]
}

export type OrderAdjustMeta = {
  orderAdjusted: boolean
  orderNb: number
}

export function listProjectSteppers(projectId: string) {
  return apiRequest<{ data: ProjectStepperNode[] }>(`/projects/${projectId}/steppers`)
}

export function getProjectStepper(projectId: string, stepperProjectId: string) {
  return apiRequest<{ data: ProjectStepperDetail }>(
    `/projects/${projectId}/steppers/${stepperProjectId}`,
  )
}

export function saveProjectStepperValues(
  projectId: string,
  stepperProjectId: string,
  values: Array<{ id: string; value: StepperValue }>,
) {
  return apiRequest<{ data: ProjectStepperDetail }>(
    `/projects/${projectId}/steppers/${stepperProjectId}/values`,
    {
      method: 'PUT',
      body: JSON.stringify({ values }),
    },
  )
}

export function addProjectStepInput(
  projectId: string,
  stepperProjectId: string,
  input: { inputTypeId: string; label: string; orderNb?: number; value?: StepperValue },
) {
  return apiRequest<{ data: ProjectStepperInputField; meta?: OrderAdjustMeta }>(
    `/projects/${projectId}/steppers/${stepperProjectId}/inputs`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  )
}

export function deleteProjectStepInput(
  projectId: string,
  stepperProjectId: string,
  inputId: string,
) {
  return apiRequest<void>(
    `/projects/${projectId}/steppers/${stepperProjectId}/inputs/${inputId}`,
    { method: 'DELETE' },
  )
}
