export type WorkerAvailability = 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE'
export type WorkerSkillLevel = 'BASIC' | 'INTERMEDIATE' | 'EXPERT'

export type WorkerExperience = {
  id: string
  company: string
  roleTitle: string
  projectType: string | null
  location: string | null
  startDate: string | null
  endDate: string | null
  isCurrent: boolean
  description: string | null
  sortOrder: number
}

export type WorkerEducation = {
  id: string
  school: string
  degree: string | null
  field: string | null
  startYear: number | null
  endYear: number | null
  sortOrder: number
}

export type WorkerCertification = {
  id: string
  name: string
  issuer: string | null
  issuedAt: string | null
  expiresAt: string | null
  credentialId: string | null
  sortOrder: number
}

export type WorkerSkill = {
  id: string
  categoryId: string
  categoryName: string
  categoryNameAr: string | null
  categoryIsActive: boolean
  level: WorkerSkillLevel
}

export type WorkerVerificationStatus = 'UNVERIFIED' | 'REQUESTED' | 'VERIFIED'

export type WorkerMineResult = {
  profile: WorkerProfile | null
  verificationStatus: WorkerVerificationStatus
}

export type WorkerProfileUser = {
  id: string
  /** Redacted (`null`) for non-owner / non-admin marketplace viewers. */
  email: string | null
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING'
  verificationStatus: 'UNVERIFIED' | 'REQUESTED' | 'VERIFIED'
  isVerified: boolean
  firstName: string | null
  lastName: string | null
  displayName: string | null
  phone: string | null
  /** Avatar File id (stable cache key), not a URL. */
  avatarUrl: string | null
  /** Loadable avatar image URL (public or presigned); null when none / unresolvable. */
  avatarImageUrl?: string | null
}

/** Full CV payload for worker preview / edit. */
export type WorkerProfile = {
  id: string
  userId: string
  headline: string | null
  bio: string | null
  specialty: string | null
  yearsExperience: number | null
  languages: string | null
  city: string | null
  country: string | null
  hourlyRate: string | null
  dailyRate: string | null
  currency: string | null
  availability: WorkerAvailability
  isPublic: boolean
  cvUrl: string | null
  experiences: WorkerExperience[]
  education: WorkerEducation[]
  certifications: WorkerCertification[]
  skills: WorkerSkill[]
  user: WorkerProfileUser
  createdAt: string
  updatedAt: string
}

/** Lean row for directory lists. */
export type WorkerDirectoryItem = {
  id: string
  userId: string
  headline: string | null
  specialty: string | null
  yearsExperience: number | null
  city: string | null
  country: string | null
  hourlyRate: string | null
  dailyRate: string | null
  currency: string | null
  availability: WorkerAvailability
  isPublic: boolean
  verificationStatus: 'UNVERIFIED' | 'REQUESTED' | 'VERIFIED'
  isVerified: boolean
  displayName: string | null
  firstName: string | null
  lastName: string | null
  /** Avatar File id (stable cache key), not a URL. */
  avatarUrl: string | null
  /** Loadable avatar image URL (public or presigned); null when none / unresolvable. */
  avatarImageUrl?: string | null
  skillNames: string[]
  createdAt: string
  updatedAt: string
}

export type WorkerAvailabilityCounts = {
  AVAILABLE: number
  BUSY: number
  UNAVAILABLE: number
}

export type PaginatedWorkers = {
  data: WorkerDirectoryItem[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
    availabilityCounts: WorkerAvailabilityCounts
    /** Worker counts keyed by specialty id (null/empty specialties omitted). */
    specialtyCounts: Record<string, number>
  }
}
