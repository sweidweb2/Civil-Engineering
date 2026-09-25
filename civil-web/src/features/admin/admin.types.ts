import type { AuthRole } from '@/services/auth'

export type UserStatus = 'ACTIVE' | 'INACTIVE'
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

export type LoginDayPoint = {
  date: string
  count: number
}

export type VerificationStatus = 'unverified' | 'requested' | 'verified'

export type WorkerVerificationRow = AdminUserRow & {
  verification: VerificationStatus
}

export type ProviderShop = {
  id: string
  userId: string
  name: string
  location: string
  category: string
  listingCount: number
  status: UserStatus
}

export type CategoryKind = 'material' | 'worker'

export type PlatformCategory = {
  id: string
  name: string
  kind: CategoryKind
}

export type ProjectStatus = 'planning' | 'active' | 'completed'

export type AdminProject = {
  id: string
  name: string
  location: string
  managerName: string
  status: ProjectStatus
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

export type ReviewStatus = 'pending' | 'accepted' | 'rejected'
export type ReviewTarget = 'provider' | 'worker' | 'listing'

export type PlatformReview = {
  id: string
  authorName: string
  authorEmail: string
  targetType: ReviewTarget
  targetName: string
  rating: number
  comment: string
  status: ReviewStatus
  createdAt: string
}

export type AnalyticsSnapshot = {
  registeredUsers: number
  activePms: number
  providers: number
  workers: number
  projects: number
  marketplaceListings: number
  listingViews: number
  directoryViews: number
  reports: number
  verificationRequests: number
}
