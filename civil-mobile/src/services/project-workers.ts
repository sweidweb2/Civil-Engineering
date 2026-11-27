import { apiRequest } from './api'

export type ProjectWorkerStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED'

export type ProjectWorker = {
  id: string
  projectId: string
  workerUserId: string
  invitedById: string
  status: ProjectWorkerStatus
  invitedAt: string
  respondedAt: string | null
  createdAt: string
  updatedAt: string
  worker: {
    id: string
    email: string
    displayName: string | null
    firstName: string | null
    lastName: string | null
    specialty: string | null
    city: string | null
    avatarUrl: string | null
  }
}

export type WorkerProjectSummary = {
  projectWorkerId: string
  status: ProjectWorkerStatus
  invitedAt: string
  respondedAt: string | null
  project: {
    id: string
    name: string
    code: string | null
    city: string | null
    country: string | null
    status: string
    startDate: string | null
    endDate: string | null
    archivedAt: string | null
    owner: {
      id: string
      displayName: string | null
      firstName: string | null
      lastName: string | null
    }
  }
}

type PageMeta = { page: number; limit: number; total: number; totalPages: number }

export function listProjectWorkers(
  projectId: string,
  page = 1,
  limit = 50,
  status?: ProjectWorkerStatus,
) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (status) params.set('status', status)
  return apiRequest<{ data: ProjectWorker[]; meta: PageMeta }>(
    `/projects/${projectId}/workers?${params.toString()}`,
  )
}

export function inviteProjectWorker(projectId: string, workerUserId: string) {
  return apiRequest<{ data: ProjectWorker }>(`/projects/${projectId}/workers`, {
    method: 'POST',
    body: JSON.stringify({ workerUserId }),
  })
}

export function removeProjectWorker(projectId: string, id: string) {
  return apiRequest<void>(`/projects/${projectId}/workers/${id}`, { method: 'DELETE' })
}

export function listMyWorkerProjects(page = 1, limit = 20) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  return apiRequest<{ data: WorkerProjectSummary[]; meta: PageMeta }>(
    `/workers/me/projects?${params.toString()}`,
  )
}

export function getMyWorkerProject(projectId: string) {
  return apiRequest<{ data: WorkerProjectSummary }>(`/workers/me/projects/${projectId}`)
}

export function acceptWorkerProject(projectId: string) {
  return apiRequest<{ data: WorkerProjectSummary }>(`/workers/me/projects/${projectId}/accept`, {
    method: 'POST',
  })
}

export function rejectWorkerProject(projectId: string) {
  return apiRequest<{ data: WorkerProjectSummary }>(`/workers/me/projects/${projectId}/reject`, {
    method: 'POST',
  })
}

export function projectWorkerName(w: ProjectWorker['worker']) {
  return w.displayName || [w.firstName, w.lastName].filter(Boolean).join(' ') || w.email || 'Worker'
}
