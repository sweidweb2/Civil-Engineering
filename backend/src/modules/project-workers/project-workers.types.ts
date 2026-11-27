export type ProjectWorkerStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED'

export type ProjectWorkerWorkerSummary = {
  id: string
  email: string
  displayName: string | null
  firstName: string | null
  lastName: string | null
  specialty: string | null
  city: string | null
  avatarUrl: string | null
}

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
  worker: ProjectWorkerWorkerSummary
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

/** Soft notify — failures must not fail the invite mutation. */
export type ProjectWorkersNotifyGateway = {
  notify: (input: {
    senderId: string
    receiverId: string
    title: string
    message: string
  }) => Promise<void>
}
