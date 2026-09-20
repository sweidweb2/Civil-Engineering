export type ProjectStatus = 'draft' | 'active' | 'on_hold' | 'completed' | 'archived'

export type Project = {
  id: string
  name: string
  status: ProjectStatus
  ownerId: string
  description?: string
  createdAt: string
  updatedAt: string
}
