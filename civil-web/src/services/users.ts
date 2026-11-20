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

export type UserRoleCounts = Record<AuthRole, number>

export type UserDirectoryCounts = {
  accounts: number
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
  roles: UserRoleCounts
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

export type UserLookup = {
  id: string
  email: string
  name: string
}

export function listUserLookups(page = 1, limit = 20, q?: string) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (q) params.set('q', q)
  return apiRequest<{
    data: UserLookup[]
    meta: { page: number; limit: number; total: number; totalPages: number }
  }>(`/users/lookup?${params.toString()}`, { cache: 'no-store' })
}

export function listUsers(page = 1, limit = 100, q?: string) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (q) params.set('q', q)
  return apiRequest<PaginatedUsers>(`/users?${params.toString()}`, { cache: 'no-store' })
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
}

/** Single-request admin dashboard aggregates. */
export function getAdminOverview() {
  return apiRequest<{ data: AdminOverview }>('/users/admin-overview')
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

export type UserAvatarResponse = {
  data: User
  meta: { avatarDownloadUrl: string | null }
}

export function setUserAvatar(id: string, fileId: string) {
  return apiRequest<UserAvatarResponse>(`/users/${id}/avatar`, {
    method: 'PUT',
    body: JSON.stringify({ fileId }),
  })
}

/** API → R2 upload (avoids browser CORS on the R2 endpoint). */
export function uploadUserAvatar(
  id: string,
  file: File,
  options?: { onProgress?: (percent: number) => void },
) {
  const body = new FormData()
  body.append('image', file)
  return apiRequest<UserAvatarResponse>(`/users/${id}/avatar/upload`, {
    method: 'POST',
    body,
    onUploadProgress: options?.onProgress,
  })
}

export function clearUserAvatar(id: string) {
  return apiRequest<UserAvatarResponse>(`/users/${id}/avatar`, {
    method: 'DELETE',
  })
}

export function getUserAvatarUrl(id: string) {
  return apiRequest<{ data: { avatarDownloadUrl: string | null } }>(`/users/${id}/avatar`)
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

export function listVerifications(
  query: { page?: number; limit?: number; q?: string; status?: ApiVerificationStatus } = {},
) {
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    limit: String(query.limit ?? 20),
  })
  if (query.q) params.set('q', query.q)
  if (query.status) params.set('status', query.status)
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
