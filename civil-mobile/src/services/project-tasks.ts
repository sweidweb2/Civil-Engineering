import { apiRequest } from './api'

export type ProjectTaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE'

export type ProjectTask = {
  id: string
  projectId: string
  title: string
  description: string | null
  status: ProjectTaskStatus
  dueDate: string | null
  assigneeProjectWorkerId: string | null
  createdById: string
  createdAt: string
  updatedAt: string
  assignee: {
    id: string
    workerUserId: string
    status: string
    displayName: string | null
    firstName: string | null
    lastName: string | null
    email: string
  } | null
}

export type CreateProjectTaskInput = {
  title: string
  description?: string | null
  status?: ProjectTaskStatus
  dueDate?: string | null
  assigneeProjectWorkerId?: string | null
}

export type UpdateProjectTaskInput = Partial<CreateProjectTaskInput>

type PageMeta = { page: number; limit: number; total: number; totalPages: number }

export function listProjectTasks(
  projectId: string,
  page = 1,
  limit = 50,
  status?: ProjectTaskStatus,
) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (status) params.set('status', status)
  return apiRequest<{ data: ProjectTask[]; meta: PageMeta }>(
    `/projects/${projectId}/tasks?${params.toString()}`,
  )
}

export function createProjectTask(projectId: string, input: CreateProjectTaskInput) {
  return apiRequest<{ data: ProjectTask }>(`/projects/${projectId}/tasks`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateProjectTask(
  projectId: string,
  taskId: string,
  input: UpdateProjectTaskInput,
) {
  return apiRequest<{ data: ProjectTask }>(`/projects/${projectId}/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function deleteProjectTask(projectId: string, taskId: string) {
  return apiRequest<void>(`/projects/${projectId}/tasks/${taskId}`, { method: 'DELETE' })
}

export function listMyProjectTasks(
  projectId: string,
  page = 1,
  limit = 50,
  status?: ProjectTaskStatus,
) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (status) params.set('status', status)
  return apiRequest<{ data: ProjectTask[]; meta: PageMeta }>(
    `/workers/me/projects/${projectId}/tasks?${params.toString()}`,
  )
}

export function updateMyProjectTaskStatus(
  projectId: string,
  taskId: string,
  status: ProjectTaskStatus,
) {
  return apiRequest<{ data: ProjectTask }>(`/workers/me/projects/${projectId}/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export const PROJECT_TASK_STATUS_OPTIONS: ProjectTaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE']
