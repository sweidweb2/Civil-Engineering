import { apiRequest } from './api'

export type InputTypeStatus = 'ACTIVE' | 'INACTIVE'

export const INPUT_TYPE_CODE_OPTIONS = [
  { value: 'TEXT', label: 'Text' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'YES_NO', label: 'Yes / No' },
  { value: 'DATE', label: 'Date' },
] as const

export type InputTypeCode = (typeof INPUT_TYPE_CODE_OPTIONS)[number]['value']

export type InputType = {
  id: string
  code: string
  label: string
  status: InputTypeStatus
  sortOrder: number
  usageCount: number
  createdAt: string
  updatedAt: string
}

export type PaginatedInputTypes = {
  data: InputType[]
  meta: {
    page: number
    limit: number
    total: number
    activeCount: number
    inactiveCount: number
  }
}

export type InputTypeWriteInput = {
  code: InputTypeCode | string
  label: string
  status?: InputTypeStatus
  sortOrder?: number
}

export function listInputTypes(
  page = 1,
  limit = 50,
  filters?: { q?: string; status?: InputTypeStatus },
) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (filters?.q) params.set('q', filters.q)
  if (filters?.status) params.set('status', filters.status)
  return apiRequest<PaginatedInputTypes>(`/input-types?${params.toString()}`)
}

export function createInputType(input: InputTypeWriteInput) {
  return apiRequest<{ data: InputType }>('/input-types', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateInputType(id: string, input: Partial<InputTypeWriteInput>) {
  return apiRequest<{ data: InputType }>(`/input-types/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function deleteInputType(id: string) {
  return apiRequest<void>(`/input-types/${id}`, { method: 'DELETE' })
}
