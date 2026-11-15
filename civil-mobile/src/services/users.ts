import { apiRequest } from './api'
import type { AuthRole } from './auth'

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING'

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

export type UpdateUserInput = {
  firstName?: string
  lastName?: string
  displayName?: string
  phone?: string
}

export function getUser(id: string) {
  return apiRequest<{ data: User; meta: { avatarDownloadUrl: string | null } }>(`/users/${id}`)
}

export function updateUser(id: string, input: UpdateUserInput) {
  return apiRequest<{ data: User }>(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}
