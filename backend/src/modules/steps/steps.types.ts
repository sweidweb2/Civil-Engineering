import type { OrderAdjustMeta, StepStatus } from './steps.schema.js'

export type Step = {
  id: string
  name: string
  orderNb: number
  status: StepStatus
  userId: string
  createdAt: string
  updatedAt: string
}

export type PaginatedSteps = {
  data: Step[]
  meta: {
    page: number
    limit: number
    total: number
    activeCount: number
    inactiveCount: number
    archivedCount: number
  }
}

export type StepMutationResult = {
  data: Step
  meta?: OrderAdjustMeta
}
