import { apiRequest } from './api'

export type StepperValue = string | number | boolean | null

/** Project-owned step instance (not a Project row). */
export type ProjectStepNode = {
  id: string
  projectId: string
  name: string
  orderNb: number
  inputCount: number
  filledCount: number
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
  value: StepperValue
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

export type OrderAdjustMeta = {
  orderAdjusted: boolean
  orderNb: number
}

export function listProjectSteppers(projectId: string) {
  return apiRequest<{ data: ProjectStepNode[] }>(`/projects/${projectId}/steppers`)
}

export function getProjectStepper(projectId: string, projectStepId: string) {
  return apiRequest<{ data: ProjectStepDetail }>(
    `/projects/${projectId}/steppers/${projectStepId}`,
  )
}

export function saveProjectStepperValues(
  projectId: string,
  projectStepId: string,
  values: Array<{ id: string; value: StepperValue }>,
) {
  return apiRequest<{ data: ProjectStepDetail }>(
    `/projects/${projectId}/steppers/${projectStepId}/values`,
    {
      method: 'PUT',
      body: JSON.stringify({ values }),
    },
  )
}

export function addProjectStepInput(
  projectId: string,
  projectStepId: string,
  input: { inputTypeId: string; label: string; orderNb?: number; value?: StepperValue },
) {
  return apiRequest<{ data: ProjectStepInputField; meta?: OrderAdjustMeta }>(
    `/projects/${projectId}/steppers/${projectStepId}/inputs`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  )
}

export function deleteProjectStepInput(
  projectId: string,
  projectStepId: string,
  inputId: string,
) {
  return apiRequest<void>(
    `/projects/${projectId}/steppers/${projectStepId}/inputs/${inputId}`,
    { method: 'DELETE' },
  )
}
