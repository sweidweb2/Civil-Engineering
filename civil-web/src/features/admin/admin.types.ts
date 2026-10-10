import type { AuthRole } from '@/services/auth'

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING'
export type ApprovalStatus = 'pending' | 'approved'

/** UI row shaped from User + Profile. Never includes passwordHash. */
export type AdminUserRow = {
  id: string
  email: string
  role: AuthRole
  status: UserStatus
  isVerified: boolean
  createdAt: string
  updatedAt: string
  profile: {
    firstName: string | null
    lastName: string | null
    displayName: string | null
    phone: string | null
    avatarUrl: string | null
    createdAt: string
    updatedAt: string
  }
}

export type RegistrationRow = AdminUserRow & {
  approval: ApprovalStatus
}

export type VerificationStatus = 'unverified' | 'requested' | 'verified'

export type WorkerVerificationRow = AdminUserRow & {
  verification: VerificationStatus
}

export type DirectoryKind = 'material' | 'equipment' | 'worker'

export type DirectoryItem = {
  id: string
  name: string
  kind: DirectoryKind
  category: string
  location: string
  source: string
  price: string
}
