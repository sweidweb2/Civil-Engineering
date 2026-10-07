import { useAuthStore } from '@/stores/authStore'

import { apiRequest } from './api'

export type ProjectStatus =
  | 'DRAFT'
  | 'PLANNING'
  | 'APPROVED'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'COMPLETED'
  | 'CANCELLED'

export type ProjectType =
  | 'RESIDENTIAL'
  | 'COMMERCIAL'
  | 'INDUSTRIAL'
  | 'INFRASTRUCTURE'
  | 'RENOVATION'
  | 'OTHER'

export type Project = {
  id: string
  name: string
  description: string | null
  code: string | null
  ownerId: string
  address: string | null
  city: string | null
  country: string | null
  startDate: string | null
  endDate: string | null
  actualStartDate: string | null
  actualEndDate: string | null
  status: ProjectStatus
  progress: number
  budget: string | null
  currency: string
  actualCost: string | null
  type: ProjectType | null
  isPublic: boolean
  tags: unknown | null
  attachments: unknown | null
  notes: string | null
  createdAt: string
  updatedAt: string
  archivedAt: string | null
}

export type PaginatedProjects = {
  data: Project[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export type CreateProjectInput = {
  name: string
  description?: string
  code?: string
  type?: ProjectType
}

export type UpdateProjectInput = {
  name?: string
  description?: string
  code?: string
  address?: string
  city?: string
  country?: string
  startDate?: string
  endDate?: string
  actualStartDate?: string
  actualEndDate?: string
  status?: ProjectStatus
  progress?: number
  budget?: string
  currency?: string
  actualCost?: string
  type?: ProjectType
  isPublic?: boolean
  notes?: string
}

function accessToken() {
  return useAuthStore.getState().tokens?.accessToken ?? null
}

export function listProjects(page = 1, limit = 20) {
  return apiRequest<PaginatedProjects>(`/projects?page=${page}&limit=${limit}`, {
    accessToken: accessToken(),
  })
}

export function getProjectById(id: string) {
  return apiRequest<{ data: Project }>(`/projects/${id}`, {
    accessToken: accessToken(),
  })
}

export function createProject(input: CreateProjectInput) {
  return apiRequest<{ data: Project }>('/projects', {
    method: 'POST',
    body: JSON.stringify(input),
    accessToken: accessToken(),
  })
}

export function updateProject(id: string, input: UpdateProjectInput) {
  return apiRequest<{ data: Project }>(`/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
    accessToken: accessToken(),
  })
}

export function archiveProject(id: string) {
  return apiRequest<void>(`/projects/${id}/archive`, {
    method: 'POST',
    accessToken: accessToken(),
  })
}
