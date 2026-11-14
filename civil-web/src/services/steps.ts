import { apiRequest } from './api'

export type StepStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'

export type Step = {
  id: string
  name: string
  orderNb: number
  status: StepStatus
  userId: string
  createdAt: string
  updatedAt: string
}

export type OrderAdjustMeta = {
  orderAdjusted: boolean
  orderNb: number
}

export type PaginatedSteps = {
  data: Step[]
  meta: {
    page: number
    limit: number
    total: number
    activeCount: number
    inactiveCount: number
    archivedCount: number
  }
}

export type StepWriteInput = {
  name: string
  orderNb?: number
  status?: StepStatus
}

export type StepMutationResponse = {
  data: Step
  meta?: OrderAdjustMeta
}

export function listSteps(page = 1, limit = 8, filters?: { q?: string; status?: StepStatus }) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (filters?.q) params.set('q', filters.q)
  if (filters?.status) params.set('status', filters.status)
  return apiRequest<PaginatedSteps>(`/steps?${params.toString()}`)
}

export function createStep(input: StepWriteInput) {
  return apiRequest<StepMutationResponse>('/steps', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateStep(id: string, input: Partial<StepWriteInput>) {
  return apiRequest<StepMutationResponse>(`/steps/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function deleteStep(id: string) {
  return apiRequest<void>(`/steps/${id}`, { method: 'DELETE' })
}

export function notifyOrderAdjusted(meta?: OrderAdjustMeta) {
  if (meta?.orderAdjusted) {
    return `Order set to ${meta.orderNb} (next available slot).`
  }
  return null
}
