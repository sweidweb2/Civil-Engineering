import { apiRequest } from './api'

export type ProjectStatus =
  'DRAFT' | 'PLANNING' | 'APPROVED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'

export type ProjectType =
  'RESIDENTIAL' | 'COMMERCIAL' | 'INDUSTRIAL' | 'INFRASTRUCTURE' | 'RENOVATION' | 'OTHER'

export const PROJECT_TYPE_OPTIONS: { value: ProjectType; label: string }[] = [
  { value: 'RESIDENTIAL', label: 'Residential' },
  { value: 'COMMERCIAL', label: 'Commercial' },
  { value: 'INDUSTRIAL', label: 'Industrial' },
  { value: 'INFRASTRUCTURE', label: 'Infrastructure' },
  { value: 'RENOVATION', label: 'Renovation' },
  { value: 'OTHER', label: 'Other' },
]

export const PROJECT_STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PLANNING', label: 'Planning' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

export function projectStatusLabel(status: string): string {
  return (
    PROJECT_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
    status.replaceAll('_', ' ')
  )
}

export type Project = {
  id: string
  name: string
  description: string | null
  code: string | null
  ownerId: string
  city: string | null
  country: string | null
  startDate: string | null
  endDate: string | null
  status: ProjectStatus
  progress: number
  type: ProjectType | null
  createdAt: string
  updatedAt: string
  mainImageUrl?: string | null
  /** Stable storage key of the main image: use as the image cache key (URL is re-signed). */
  mainImageKey?: string | null
  address?: string | null
  actualStartDate?: string | null
  actualEndDate?: string | null
  budget?: string | null
  currency?: string
  actualCost?: string | null
  notes?: string | null
  archivedAt?: string | null
}

export type ProjectSummary = {
  total: number
  averageProgress: number
  counts: Record<ProjectStatus, number>
}

export type PaginatedProjects = {
  data: Project[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  /** Aggregate when `includeSummary`; otherwise `null`. */
  summary: ProjectSummary | null
}

export type CreateProjectInput = {
  name: string
  description?: string
  code?: string
  type?: ProjectType
  startDate?: string | null
  endDate?: string | null
}

export type UpdateProjectInput = {
  /** Optimistic-concurrency token — pass the project's current `updatedAt`. */
  expectedUpdatedAt: string
  name?: string
  description?: string
  code?: string
  address?: string
  city?: string
  country?: string
  startDate?: string | null
  endDate?: string | null
  status?: ProjectStatus
  type?: ProjectType
  notes?: string
}

export function listProjects(
  params: {
    page?: number
    limit?: number
    status?: ProjectStatus
    type?: ProjectType
    q?: string
    includeSummary?: boolean
  } = {},
) {
  const search = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 20),
  })
  if (params.status) search.set('status', params.status)
  if (params.type) search.set('type', params.type)
  if (params.q?.trim()) search.set('q', params.q.trim())
  if (params.includeSummary) search.set('includeSummary', 'true')
  return apiRequest<PaginatedProjects>(`/projects?${search.toString()}`)
}

export function getProjectById(id: string) {
  return apiRequest<{ data: Project }>(`/projects/${id}`)
}

/** Pass `idempotencyKey` (see `useIdempotencyKey`) so a retried submit cannot duplicate. */
export function createProject(
  input: CreateProjectInput,
  options: { idempotencyKey?: string } = {},
) {
  return apiRequest<{ data: Project }>('/projects', {
    method: 'POST',
    body: JSON.stringify(input),
    idempotencyKey: options.idempotencyKey,
  })
}

export function updateProject(id: string, input: UpdateProjectInput) {
  return apiRequest<{ data: Project }>(`/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function archiveProject(id: string) {
  return apiRequest<void>(`/projects/${id}/archive`, {
    method: 'POST',
  })
}
