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
    /** Avatar File id (stable cache key), not a URL. */
    avatarUrl: string | null
  } | null
  /** Admin list rows only: loadable avatar URL (public or presigned); null when none. */
  avatarImageUrl?: string | null
  createdAt: string
  updatedAt: string
}

export type UserDirectoryCounts = {
  accounts: number
  active: number
  inactive: number
  managers: number
}

export type PaginatedUsers = {
  data: User[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
    counts?: UserDirectoryCounts
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

export function listUsers(page = 1, limit = 20, q?: string, counts = true) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (q) params.set('q', q)
  if (!counts) params.set('counts', 'false')
  return apiRequest<PaginatedUsers>(`/users?${params.toString()}`)
}

export type AdminOverview = {
  users: number
  managers: number
  workers: number
  providers: number
  pendingProviders: number
  projects: number
  listings: number
  reviews: number
  verificationRequests: number
  pendingRequests: number
  pendingReviews: number
  recentProjects: import('./projects').Project[]
}

/** Single-request admin dashboard aggregates + recent projects. */
export function getAdminOverview() {
  return apiRequest<{ data: AdminOverview }>('/users/admin-overview')
}

export function getUser(id: string) {
  return apiRequest<{ data: User; meta: { avatarDownloadUrl: string | null } }>(`/users/${id}`)
}

/** Loadable avatar URL for a user (self or admin); null when no avatar is set. */
export function getUserAvatarUrl(id: string) {
  return apiRequest<{ data: { avatarDownloadUrl: string | null } }>(`/users/${id}/avatar`)
}

/** Pass `idempotencyKey` (see `useIdempotencyKey`) so a retried submit cannot duplicate. */
export function createUser(input: CreateUserInput, options: { idempotencyKey?: string } = {}) {
  return apiRequest<{ data: User }>('/users', {
    method: 'POST',
    body: JSON.stringify(input),
    idempotencyKey: options.idempotencyKey,
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
    counts?: ApprovalCounts
  }
}

export function listApprovals(query: {
  approval: ApprovalListStatus
  page?: number
  limit?: number
  q?: string
  counts?: boolean
}) {
  const params = new URLSearchParams({
    approval: query.approval,
    page: String(query.page ?? 1),
    limit: String(query.limit ?? 20),
  })
  if (query.q) params.set('q', query.q)
  if (query.counts === false) params.set('counts', 'false')
  return apiRequest<PaginatedApprovals>(`/users/approvals?${params.toString()}`)
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

/** Admin → worker verification list (WORKER users, filtered by verification status). */
export function listVerifications(query: {
  status?: VerificationStatus
  page?: number
  limit?: number
  q?: string
}) {
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    limit: String(query.limit ?? 20),
  })
  if (query.q) params.set('q', query.q)
  if (query.status) params.set('status', query.status)
  return apiRequest<PaginatedVerifications>(`/users/verifications?${params.toString()}`)
}

export function setVerification(id: string, verificationStatus: VerificationStatus) {
  return apiRequest<{ data: User }>(`/users/${id}/verification`, {
    method: 'POST',
    body: JSON.stringify({ verificationStatus }),
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
