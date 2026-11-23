import type { ProjectListItem } from '../projects/index.js'

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING'

export type UserRole = 'SUPER' | 'ADMIN' | 'PROVIDER' | 'WORKER' | 'MANAGER' | 'CLIENT'

/** Roles that stay pending until an admin approves the account. */
export const APPROVAL_ROLES = ['MANAGER', 'PROVIDER', 'WORKER'] as const

export type ApprovalRole = (typeof APPROVAL_ROLES)[number]

/** Worker marketplace visibility. Public only when VERIFIED. */
export const VERIFICATION_STATUSES = ['UNVERIFIED', 'REQUESTED', 'VERIFIED'] as const

export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number]

export type UserProfile = {
  firstName: string | null
  lastName: string | null
  displayName: string | null
  phone: string | null
  /** File.id in the R2 files pipeline when set (not a public URL). */
  avatarUrl: string | null
}

export type User = {
  id: string
  email: string
  role: UserRole
  status: UserStatus
  verificationStatus: VerificationStatus
  isVerified: boolean
  profile: UserProfile | null
  /** Admin list rows only: loadable avatar URL (public or presigned); null when none. */
  avatarImageUrl?: string | null
  createdAt: string
  updatedAt: string
}

export type UserAvatarResult = {
  user: User
  /** Short-lived presigned GET for display. */
  avatarDownloadUrl: string | null
}

/** Admin dashboard aggregate: counts plus the newest projects (lean list rows). */
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
  /** Pending registration approvals (managers, providers, workers). */
  pendingRequests: number
  pendingReviews: number
  recentProjects: ProjectListItem[]
}

/** Lean row for recipient pickers. */
export type UserLookup = {
  id: string
  email: string
  name: string
}
