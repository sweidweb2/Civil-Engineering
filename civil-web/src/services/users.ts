import { apiRequest } from './api'
import type { AuthRole } from './auth'

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING'

export type ApprovalRole = 'MANAGER' | 'PROVIDER' | 'WORKER'
export type ApprovalListStatus = 'pending' | 'approved'

export type User = {
  id: string
  email: string
  role: AuthRole
  status: UserStatus
  verificationStatus: 'UNVERIFIED' | 'REQUESTED' | 'VERIFIED'
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

export type UserDirectoryCounts = {
  active: number
  inactive: number
  managers: number
  createdThisMonth: number
  createdLastMonth: number
  activeCreatedThisMonth: number
  activeCreatedLastMonth: number
  inactiveCreatedThisMonth: number
  inactiveCreatedLastMonth: number
  managersCreatedThisMonth: number
  managersCreatedLastMonth: number
}

export type PaginatedUsers = {
  data: User[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
    counts: UserDirectoryCounts
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

export async function listAllUsers(): Promise<User[]> {
  const first = await listUsers(1, 100)
  if (first.meta.totalPages <= 1) return first.data
  const rest = await Promise.all(
    Array.from({ length: first.meta.totalPages - 1 }, (_, index) => listUsers(index + 2, 100)),
  )
  return [first.data, ...rest.map((page) => page.data)].flat()
}

export function listUsers(page = 1, limit = 100) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  return apiRequest<PaginatedUsers>(`/users?${params.toString()}`, { cache: 'no-store' })
}

export function getUser(id: string) {
  return apiRequest<{ data: User }>(`/users/${id}`)
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

export type ApprovalCounts = {
  pending: number
  approved: number
  providersPending: number
}

export type PaginatedApprovals = {
  data: User[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
    counts: ApprovalCounts
  }
}

export type CreateApprovalInput = {
  email: string
  password: string
  role: ApprovalRole
  firstName?: string
  lastName?: string
  displayName?: string
  phone?: string
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

export function createApproval(input: CreateApprovalInput) {
  return apiRequest<{ data: User }>('/users/approvals', {
    method: 'POST',
    body: JSON.stringify(input),
  })
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

export type VerificationCounts = {
  workers: number
  unverified: number
  requested: number
  verified: number
}

export type PaginatedVerifications = {
  data: User[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
    counts: VerificationCounts
  }
}

export type CreateVerificationInput = {
  email: string
  password: string
  firstName?: string
  lastName?: string
  displayName?: string
  phone?: string
}

export type ApiVerificationStatus = User['verificationStatus']

export function listVerifications(query: { page?: number; limit?: number; q?: string } = {}) {
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    limit: String(query.limit ?? 20),
  })
  if (query.q) params.set('q', query.q)
  return apiRequest<PaginatedVerifications>(`/users/verifications?${params.toString()}`)
}

export function createVerification(input: CreateVerificationInput) {
  return apiRequest<{ data: User }>('/users/verifications', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function setVerification(id: string, verificationStatus: ApiVerificationStatus) {
  return apiRequest<{ data: User }>(`/users/${id}/verification`, {
    method: 'POST',
    body: JSON.stringify({ verificationStatus }),
  })
}

export function deleteVerification(id: string) {
  return apiRequest<void>(`/users/${id}/verification`, { method: 'DELETE' })
}
