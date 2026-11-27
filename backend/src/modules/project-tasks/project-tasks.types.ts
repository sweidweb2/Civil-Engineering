export type ProjectTaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE'

export type ProjectTaskAssignee = {
  id: string
  workerUserId: string
  status: string
  displayName: string | null
  firstName: string | null
  lastName: string | null
  email: string
}

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
  assignee: ProjectTaskAssignee | null
}
