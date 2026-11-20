import { apiRequest } from './api'

/** Optional professional CV for project managers (`manager_profiles`). */
export type ManagerProfile = {
  id: string
  userId: string
  headline: string | null
  bio: string | null
  yearsExperience: number | null
  specialty: string | null
  education: string | null
  certifications: string | null
  skills: string | null
  languages: string | null
  city: string | null
  country: string | null
  website: string | null
  linkedinUrl: string | null
  cvUrl: string | null
  availability: string | null
  projectTypes: string | null
  createdAt: string
  updatedAt: string
}

/** Full PUT payload: every field is sent, and null clears it. */
export type ManagerProfileInput = Omit<ManagerProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>

export function getMyManagerProfile() {
  return apiRequest<{ data: ManagerProfile | null }>('/manager-profiles/me')
}

export function upsertMyManagerProfile(input: ManagerProfileInput) {
  return apiRequest<{ data: ManagerProfile }>('/manager-profiles/me', {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}
