import type { InputTypeStatus } from './input-types.schema.js'

export type InputType = {
  id: string
  code: string
  label: string
  status: InputTypeStatus
  sortOrder: number
  usageCount: number
  createdAt: string
  updatedAt: string
}

export type PaginatedInputTypes = {
  data: InputType[]
  meta: {
    page: number
    limit: number
    total: number
    activeCount: number
    inactiveCount: number
  }
}
