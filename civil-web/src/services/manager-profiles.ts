import { apiRequest } from './api'

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

export type ManagerProfileInput = {
  headline?: string | null
  bio?: string | null
  yearsExperience?: number | null
  specialty?: string | null
  education?: string | null
  certifications?: string | null
  skills?: string | null
  languages?: string | null
  city?: string | null
  country?: string | null
  website?: string | null
  linkedinUrl?: string | null
  cvUrl?: string | null
  availability?: string | null
  projectTypes?: string | null
}

export function getMyManagerProfile() {
  return apiRequest<{ data: ManagerProfile | null }>('/manager-profiles/me', {
    cache: 'no-store',
  })
}

export function upsertMyManagerProfile(input: ManagerProfileInput) {
  return apiRequest<{ data: ManagerProfile }>('/manager-profiles/me', {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export function deleteMyManagerProfile() {
  return apiRequest<void>('/manager-profiles/me', {
    method: 'DELETE',
  })
}
