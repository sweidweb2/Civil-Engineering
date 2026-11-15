import { apiRequest } from './api'
import type { AuthRole } from './auth'

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING'
export type ApprovalRole = 'MANAGER' | 'PROVIDER' | 'WORKER'
export type ApprovalListStatus = 'pending' | 'approved'
export type VerificationStatus = 'UNVERIFIED' | 'REQUESTED' | 'VERIFIED'

export type User = {
  id: string
  email: string
  role: AuthRole
  status: UserStatus
  verificationStatus?: VerificationStatus
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

export type CreateUserInput = {
  email: string
  password: string
  role?: AuthRole
  isVerified?: boolean
  firstName?: string
  lastName?: string
  displayName?: string
  phone?: string
}

export type UpdateUserInput = {
  role?: AuthRole
  status?: UserStatus
  isVerified?: boolean
  firstName?: string
  lastName?: string
  displayName?: string
  phone?: string
}

export const AUTH_ROLE_OPTIONS: { value: AuthRole; label: string }[] = [
  { value: 'SUPER', label: 'Super' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'PROVIDER', label: 'Provider' },
  { value: 'WORKER', label: 'Worker' },
  { value: 'CLIENT', label: 'Client' },
]

export function listUsers(page = 1, limit = 20, q?: string) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (q) params.set('q', q)
  return apiRequest<PaginatedUsers>(`/users?${params.toString()}`)
}

export function getUser(id: string) {
  return apiRequest<{ data: User; meta: { avatarDownloadUrl: string | null } }>(`/users/${id}`)
}

export function createUser(input: CreateUserInput) {
  return apiRequest<{ data: User }>('/users', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateUser(id: string, input: UpdateUserInput) {
  return apiRequest<{ data: User }>(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function deactivateUser(id: string) {
  return apiRequest<{ data: User }>(`/users/${id}/deactivate`, {
    method: 'POST',
  })
}

export type PaginatedApprovals = {
  data: User[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export function listApprovals(query: {
  approval: ApprovalListStatus
  page?: number
  limit?: number
  q?: string
}) {
  const params = new URLSearchParams({
    approval: query.approval,
    page: String(query.page ?? 1),
    limit: String(query.limit ?? 20),
  })
  if (query.q) params.set('q', query.q)
  return apiRequest<PaginatedApprovals>(`/users/approvals?${params.toString()}`)
}

export function approveUser(id: string) {
  return apiRequest<{ data: User }>(`/users/${id}/approve`, { method: 'POST' })
}

export function unapproveUser(id: string) {
  return apiRequest<{ data: User }>(`/users/${id}/unapprove`, { method: 'POST' })
}

export function deleteApproval(id: string) {
  return apiRequest<void>(`/users/${id}/approval`, { method: 'DELETE' })
}
