import { useAuthStore } from '@/stores/authStore'

import { apiRequest } from './api'

export type UserRole = 'SUPER' | 'ADMIN' | 'PROVIDER' | 'WORKER' | 'MANAGER' | 'CLIENT'
export type UserStatus = 'ACTIVE' | 'INACTIVE'

export type UserProfile = {
  firstName: string | null
  lastName: string | null
  displayName: string | null
  phone: string | null
  avatarUrl: string | null
}

export type User = {
  id: string
  email: string
  role: UserRole
  status: UserStatus
  profile: UserProfile | null
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

export type CreateUserInput = {
  email: string
  password: string
  role?: UserRole
  firstName?: string
  lastName?: string
  displayName?: string
  phone?: string
}

export type UpdateUserInput = {
  role?: UserRole
  status?: UserStatus
  firstName?: string
  lastName?: string
  displayName?: string
  phone?: string
}

function accessToken() {
  return useAuthStore.getState().tokens?.accessToken ?? null
}

export function listUsers(page = 1, limit = 20) {
  return apiRequest<PaginatedUsers>(`/users?page=${page}&limit=${limit}`, {
    accessToken: accessToken(),
  })
}

export function getUserById(id: string) {
  return apiRequest<{ data: User }>(`/users/${id}`, {
    accessToken: accessToken(),
  })
}

export function createUser(input: CreateUserInput) {
  return apiRequest<{ data: User }>('/users', {
    method: 'POST',
    body: JSON.stringify(input),
    accessToken: accessToken(),
  })
}

export function updateUser(id: string, input: UpdateUserInput) {
  return apiRequest<{ data: User }>(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
    accessToken: accessToken(),
  })
}

export function deactivateUser(id: string) {
  return apiRequest<{ data: User }>(`/users/${id}/deactivate`, {
    method: 'POST',
    accessToken: accessToken(),
  })
}
