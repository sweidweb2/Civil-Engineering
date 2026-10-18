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
  createdAt: string
  updatedAt: string
}

/** Lean row for recipient pickers. */
export type UserLookup = {
  id: string
  email: string
  name: string
}
