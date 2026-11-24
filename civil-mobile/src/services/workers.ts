import { apiRequest } from './api'

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

export type WorkerProfileUser = {
  id: string
  /** Null for non-owner / non-admin marketplace viewers. */
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
  /** Loadable avatar image URL (public or presigned); null when none. */
  avatarImageUrl?: string | null
}

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

/** Lean row from `GET /workers` directory lists (no nested user). */
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
  verificationStatus: WorkerVerificationStatus
  isVerified: boolean
  displayName: string | null
  firstName: string | null
  lastName: string | null
  /** Avatar File id (stable cache key), not a URL. */
  avatarUrl: string | null
  /** Loadable avatar image URL (public or presigned); null when none. */
  avatarImageUrl?: string | null
  skillNames: string[]
  createdAt: string
  updatedAt: string
}

export type WorkerExperienceWrite = {
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

export type WorkerEducationWrite = {
  school: string
  degree: string | null
  field: string | null
  startYear: number | null
  endYear: number | null
  sortOrder: number
}

export type WorkerCertificationWrite = {
  name: string
  issuer: string | null
  issuedAt: string | null
  expiresAt: string | null
  credentialId: string | null
  sortOrder: number
}

export type WorkerSkillWrite = {
  categoryId: string
  level: WorkerSkillLevel
}

/** Full-replace PUT body for `/workers/me`. */
export type WorkerProfileWriteInput = {
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
  experiences: WorkerExperienceWrite[]
  education: WorkerEducationWrite[]
  certifications: WorkerCertificationWrite[]
  skills: WorkerSkillWrite[]
  /** Optimistic concurrency token; null only for first create. */
  expectedUpdatedAt: string | null
}

export const WORKER_AVAILABILITY_OPTIONS: { value: WorkerAvailability; label: string }[] = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'BUSY', label: 'Busy' },
  { value: 'UNAVAILABLE', label: 'Unavailable' },
]

export const WORKER_SKILL_LEVEL_OPTIONS: { value: WorkerSkillLevel; label: string }[] = [
  { value: 'BASIC', label: 'Basic' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'EXPERT', label: 'Expert' },
]

export const EMPTY_WORKER_WRITE: WorkerProfileWriteInput = {
  headline: null,
  bio: null,
  specialty: null,
  yearsExperience: null,
  languages: null,
  city: null,
  country: null,
  hourlyRate: null,
  dailyRate: null,
  currency: null,
  availability: 'AVAILABLE',
  isPublic: false,
  cvUrl: null,
  experiences: [],
  education: [],
  certifications: [],
  skills: [],
  expectedUpdatedAt: null,
}

/** Map a loaded profile into a full PUT body (children without server ids). */
export function profileToWrite(profile: WorkerProfile): WorkerProfileWriteInput {
  return {
    headline: profile.headline,
    bio: profile.bio,
    specialty: profile.specialty,
    yearsExperience: profile.yearsExperience,
    languages: profile.languages,
    city: profile.city,
    country: profile.country,
    hourlyRate: profile.hourlyRate,
    dailyRate: profile.dailyRate,
    currency: profile.currency,
    availability: profile.availability,
    isPublic: profile.isPublic,
    cvUrl: profile.cvUrl,
    experiences: profile.experiences.map((item, index) => ({
      company: item.company,
      roleTitle: item.roleTitle,
      projectType: item.projectType,
      location: item.location,
      startDate: item.startDate,
      endDate: item.endDate,
      isCurrent: item.isCurrent,
      description: item.description,
      sortOrder: item.sortOrder ?? index,
    })),
    education: profile.education.map((item, index) => ({
      school: item.school,
      degree: item.degree,
      field: item.field,
      startYear: item.startYear,
      endYear: item.endYear,
      sortOrder: item.sortOrder ?? index,
    })),
    certifications: profile.certifications.map((item, index) => ({
      name: item.name,
      issuer: item.issuer,
      issuedAt: item.issuedAt,
      expiresAt: item.expiresAt,
      credentialId: item.credentialId,
      sortOrder: item.sortOrder ?? index,
    })),
    skills: profile.skills.map((item) => ({
      categoryId: item.categoryId,
      level: item.level,
    })),
    expectedUpdatedAt: profile.updatedAt,
  }
}

export function getMyWorkerProfile() {
  return apiRequest<{
    data: WorkerProfile | null
    meta: { verificationStatus: WorkerVerificationStatus }
  }>('/workers/me')
}

export function upsertMyWorkerProfile(input: WorkerProfileWriteInput) {
  return apiRequest<{ data: WorkerProfile }>('/workers/me', {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export function deleteMyWorkerProfile() {
  return apiRequest<void>('/workers/me', { method: 'DELETE' })
}

export function requestWorkerVerification() {
  return apiRequest<{ data: { verificationStatus: 'REQUESTED' } }>(
    '/workers/me/request-verification',
    { method: 'POST' },
  )
}

export function setWorkerVisibility(userId: string, isPublic: boolean) {
  return apiRequest<{ data: WorkerProfile }>(`/workers/${userId}/visibility`, {
    method: 'PATCH',
    body: JSON.stringify({ isPublic }),
  })
}

export function getWorkerByUserId(userId: string) {
  return apiRequest<{ data: WorkerProfile }>(`/workers/${userId}`)
}

export type PaginatedWorkers = {
  data: WorkerDirectoryItem[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
    specialtyCounts?: Record<string, number>
  }
}

/** Public marketplace list: non-admins only see public, verified workers. */
export function listWorkers(
  params: {
    page?: number
    limit?: number
    q?: string
    specialty?: string
    /** When true, meta includes specialtyCounts (slightly heavier). */
    counts?: boolean
  } = {},
) {
  const search = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 20),
    counts: params.counts ? 'true' : 'false',
  })
  if (params.q?.trim()) search.set('q', params.q.trim())
  if (params.specialty?.trim()) search.set('specialty', params.specialty.trim())
  return apiRequest<PaginatedWorkers>(`/workers?${search.toString()}`)
}

export function directoryWorkerName(w: WorkerDirectoryItem) {
  return w.displayName || [w.firstName, w.lastName].filter(Boolean).join(' ') || 'Worker'
}
