import type { OrderAdjustMeta, StepStatus } from './steps.schema.js'

export type Step = {
  id: string
  name: string
  orderNb: number
  status: StepStatus
  userId: string
  inputCount: number
  createdAt: string
  updatedAt: string
}

export type StepInput = {
  id: string
  stepId: string
  inputTypeId: string
  inputTypeCode: string
  inputTypeLabel: string
  label: string
  orderNb: number
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

export type PaginatedStepInputs = {
  data: StepInput[]
  meta: {
    page: number
    limit: number
    total: number
  }
}

export type StepMutationResult = {
  data: Step
  meta?: OrderAdjustMeta
}

export type StepInputMutationResult = {
  data: StepInput
  meta?: OrderAdjustMeta
}
