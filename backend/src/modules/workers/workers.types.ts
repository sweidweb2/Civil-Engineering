export type Worker = {
  id: string
  name: string
  phone?: string
  userId?: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export type ProjectAssignment = {
  id: string
  workerId: string
  projectId: string
  role: string
  startedAt: string
  endedAt?: string
}
