import { apiRequest } from './api'

export type ListingSnapshot = {
  id: string
  name: string
  type: string | null
  categoryId: string | null
  brand: string | null
  unit: string | null
  currency: string | null
  price: string | null
  priceMin: string | null
  priceMax: string | null
  rentalPrice: string | null
  rentalUnit: string | null
  providerId: string | null
  status: string
  description: string | null
}

export type FileSnapshot = {
  id: string
  originalName: string
  mime: string
  size: number | null
}

export type StepperValue = string | number | boolean | ListingSnapshot | FileSnapshot | null

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

export type ProjectStepInputField = {
  id: string
  label: string
  orderNb: number
  inputTypeId: string
  inputTypeCode: string
  inputTypeLabel: string
  categoryId: string | null
  value: StepperValue
  isProjectOnly: boolean
}

export type ProjectStepDetail = {
  id: string
  projectId: string
  name: string
  orderNb: number
  inputs: ProjectStepInputField[]
}

export type OrderAdjustMeta = {
  orderAdjusted: boolean
  orderNb: number
}

/** Aligns with backend `listingIdFromValue`. */
export function listingIdFromValue(value: StepperValue): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed === '' ? null : trimmed
  }
  if (typeof value === 'object' && 'id' in value && typeof value.id === 'string') {
    return value.id
  }
  return null
}

/** Aligns with backend `fileIdFromValue`. */
export function fileIdFromValue(value: StepperValue): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed === '' ? null : trimmed
  }
  if (
    typeof value === 'object' &&
    'id' in value &&
    typeof value.id === 'string' &&
    'originalName' in value
  ) {
    return value.id
  }
  return null
}

export function isFileSnapshot(value: StepperValue): value is FileSnapshot {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'originalName' in value &&
    typeof value.originalName === 'string'
  )
}

export function listProjectSteppers(projectId: string) {
  return apiRequest<{ data: ProjectStepNode[] }>(`/projects/${projectId}/steppers`)
}

export function getProjectStepper(projectId: string, projectStepId: string) {
  return apiRequest<{ data: ProjectStepDetail }>(`/projects/${projectId}/steppers/${projectStepId}`)
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
  input: {
    inputTypeId: string
    label: string
    orderNb?: number
    categoryId?: string | null
    value?: StepperValue
  },
) {
  return apiRequest<{ data: ProjectStepInputField; meta?: OrderAdjustMeta }>(
    `/projects/${projectId}/steppers/${projectStepId}/inputs`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  )
}

export function deleteProjectStepInput(projectId: string, projectStepId: string, inputId: string) {
  return apiRequest<void>(`/projects/${projectId}/steppers/${projectStepId}/inputs/${inputId}`, {
    method: 'DELETE',
  })
}
