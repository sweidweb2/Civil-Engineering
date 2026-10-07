import { apiRequest } from './api'
import type { AuthRole } from './auth'

export type UserStatus = 'ACTIVE' | 'INACTIVE'

export type User = {
  id: string
  email: string
  role: AuthRole
  status: UserStatus
  isVerified: boolean
  profile: {
    firstName: string | null
    lastName: string | null
    displayName: string | null
    phone: string | null
    avatarUrl: string | null
  } | null
  createdAt: string
  updatedAt: string
}

export type PaginatedUsers = {
  data: User[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export function listUsers(page = 1, limit = 100) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  return apiRequest<PaginatedUsers>(`/users?${params.toString()}`)
}
