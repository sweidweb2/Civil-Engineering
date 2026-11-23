import { appendUploadPart } from '../lib/appendUploadPart'
import { apiRequest } from './api'

export type DesignCategory =
  'ARCHITECTURAL' | 'STRUCTURAL' | 'MEP' | 'CIVIL' | 'LANDSCAPE' | 'INTERIOR' | 'OTHER'

export type DesignRequestStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | 'CANCELLED'

export const DESIGN_CATEGORY_OPTIONS: Array<{ value: DesignCategory; label: string }> = [
  { value: 'ARCHITECTURAL', label: 'Architectural' },
  { value: 'STRUCTURAL', label: 'Structural' },
  { value: 'MEP', label: 'MEP' },
  { value: 'CIVIL', label: 'Civil' },
  { value: 'LANDSCAPE', label: 'Landscape' },
  { value: 'INTERIOR', label: 'Interior' },
  { value: 'OTHER', label: 'Other' },
]

export const DESIGN_REQUEST_STATUS_OPTIONS: Array<{
  value: DesignRequestStatus
  label: string
}> = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

export function designCategoryLabel(category: string): string {
  return (
    DESIGN_CATEGORY_OPTIONS.find((option) => option.value === category)?.label ??
    category.replaceAll('_', ' ')
  )
}

export function designRequestStatusLabel(status: string): string {
  return (
    DESIGN_REQUEST_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
    status.replaceAll('_', ' ')
  )
}

export type DesignRequest = {
  id: string
  subject: string
  description: string
  category: DesignCategory | string
  status: DesignRequestStatus
  neededBy: string
  requirementFilePath: string | null
  responseFilePath: string | null
  requirementFileUrl: string | null
  responseFileUrl: string | null
  projectId: string | null
  projectName: string | null
  requestedById: string
  requestedByEmail: string
  requestedByName: string
  createdAt: string
  updatedAt: string
}

export type DesignerContact = {
  email: string
  phone: string | null
  displayName: string | null
}

export type PaginatedDesignRequests = {
  data: DesignRequest[]
  meta: { page: number; limit: number; total: number }
}

export type ListDesignRequestsQuery = {
  page?: number
  limit?: number
  status?: DesignRequestStatus
  projectId?: string
}

export type CreateDesignRequestInput = {
  subject: string
  description: string
  category: DesignCategory
  neededBy: string
  projectId?: string | null
  file?: { uri: string; mime: string; name: string } | null
}

async function appendNativeFile(body: FormData, file: { uri: string; mime: string; name: string }) {
  await appendUploadPart(body, 'file', {
    uri: file.uri,
    mime: file.mime,
    originalName: file.name,
  })
}

export function getDesignerContact() {
  return apiRequest<{ data: DesignerContact }>('/design-requests/designer-contact').then(
    (res) => res.data,
  )
}

export function listDesignRequests(query: ListDesignRequestsQuery = {}) {
  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))
  if (query.status) params.set('status', query.status)
  if (query.projectId) params.set('projectId', query.projectId)
  const qs = params.toString()
  return apiRequest<PaginatedDesignRequests>(`/design-requests${qs ? `?${qs}` : ''}`)
}

export function getDesignRequest(id: string) {
  return apiRequest<{ data: DesignRequest }>(`/design-requests/${id}`).then((res) => res.data)
}

/**
 * JSON create first (avoids RN FormData string+file bugs), then optional
 * requirement upload as a file-only multipart — same shape as stage uploads.
 */
export async function createDesignRequest(input: CreateDesignRequestInput) {
  const created = await apiRequest<{ data: DesignRequest }>('/design-requests', {
    method: 'POST',
    body: JSON.stringify({
      subject: input.subject,
      description: input.description,
      category: input.category,
      neededBy: input.neededBy,
      projectId: input.projectId ?? null,
    }),
  }).then((res) => res.data)

  if (!input.file) return created

  try {
    return await uploadDesignRequirementFile(created.id, input.file)
  } catch (error) {
    // Request exists; surface upload failure so the user can retry from detail later if needed.
    throw error
  }
}

export function updateDesignRequestStatus(id: string, status: DesignRequestStatus) {
  return apiRequest<{ data: DesignRequest }>(`/design-requests/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }).then((res) => res.data)
}

export async function uploadDesignRequirementFile(
  id: string,
  file: { uri: string; mime: string; name: string },
) {
  const body = new FormData()
  await appendNativeFile(body, file)
  return apiRequest<{ data: DesignRequest }>(`/design-requests/${id}/requirement-file`, {
    method: 'POST',
    body,
  }).then((res) => res.data)
}

export async function uploadDesignResponseFile(
  id: string,
  file: { uri: string; mime: string; name: string },
) {
  const body = new FormData()
  await appendNativeFile(body, file)
  return apiRequest<{ data: DesignRequest }>(`/design-requests/${id}/response-file`, {
    method: 'POST',
    body,
  }).then((res) => res.data)
}

export function deleteDesignRequest(id: string) {
  return apiRequest<void>(`/design-requests/${id}`, { method: 'DELETE' })
}

export function canCancelDesignRequest(status: DesignRequestStatus): boolean {
  return status === 'PENDING'
}

export function canDeleteDesignRequest(status: DesignRequestStatus): boolean {
  return status !== 'IN_PROGRESS'
}
