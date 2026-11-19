import { apiRequest } from './api'

export type ProviderStatus = 'PENDING' | 'APPROVED' | 'SUSPENDED'

export type ProviderOwner = {
  id: string
  email: string
  displayName: string | null
}

export type Provider = {
  id: string
  ownerUserId: string | null
  name: string
  description: string | null
  logoUrl: string | null
  phone: string | null
  whatsapp: string | null
  email: string | null
  website: string | null
  address: string | null
  city: string | null
  country: string | null
  lat: number | null
  lng: number | null
  status: ProviderStatus
  createdAt: string
  updatedAt: string
  owner: ProviderOwner | null
}

export type ProviderOwnerCandidate = {
  id: string
  email: string
  displayName: string | null
}

export type ProviderStatusCounts = {
  PENDING: number
  APPROVED: number
  SUSPENDED: number
}

export type PaginatedProviders = {
  data: Provider[]
  meta: {
    page: number
    limit: number
    total: number
    statusCounts: ProviderStatusCounts
  }
}

export type ProviderWriteInput = {
  ownerUserId?: string | null
  name: string
  description?: string | null
  logoUrl?: string | null
  phone?: string | null
  whatsapp?: string | null
  email?: string | null
  website?: string | null
  address?: string | null
  city?: string | null
  country?: string | null
  lat?: number | null
  lng?: number | null
  status?: ProviderStatus
}

export const PROVIDER_STATUSES: ProviderStatus[] = ['PENDING', 'APPROVED', 'SUSPENDED']

export const PROVIDER_STATUS_OPTIONS: Array<{ value: ProviderStatus; label: string }> = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'SUSPENDED', label: 'Suspended' },
]

export function providerStatusLabel(status: ProviderStatus): string {
  return PROVIDER_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function optionalNumber(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

export function toProviderWriteInput(form: {
  ownerUserId: string
  name: string
  description: string
  logoUrl: string
  phone: string
  whatsapp: string
  email: string
  website: string
  address: string
  city: string
  country: string
  lat: string
  lng: string
  status: ProviderStatus
}): ProviderWriteInput {
  return {
    ownerUserId: emptyToNull(form.ownerUserId),
    name: form.name.trim(),
    description: emptyToNull(form.description),
    logoUrl: emptyToNull(form.logoUrl),
    phone: emptyToNull(form.phone),
    whatsapp: emptyToNull(form.whatsapp),
    email: emptyToNull(form.email),
    website: emptyToNull(form.website),
    address: emptyToNull(form.address),
    city: emptyToNull(form.city),
    country: emptyToNull(form.country),
    lat: optionalNumber(form.lat),
    lng: optionalNumber(form.lng),
    status: form.status,
  }
}

export type ProviderLogoResponse = {
  data: Provider
  meta: { logoDownloadUrl: string | null }
}

export function getMyProvider() {
  return apiRequest<ProviderLogoResponse>('/providers/me')
}

export function uploadProviderLogo(
  id: string,
  file: File,
  options?: { onProgress?: (percent: number) => void },
) {
  const body = new FormData()
  body.append('image', file)
  return apiRequest<ProviderLogoResponse>(`/providers/${id}/logo/upload`, {
    method: 'POST',
    body,
    onUploadProgress: options?.onProgress,
  })
}

export function clearProviderLogo(id: string) {
  return apiRequest<ProviderLogoResponse>(`/providers/${id}/logo`, {
    method: 'DELETE',
  })
}

export function listProviders(page = 1, limit = 12, q?: string, status?: ProviderStatus) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (q) params.set('q', q)
  if (status) params.set('status', status)
  return apiRequest<PaginatedProviders>(`/providers?${params.toString()}`)
}

export function listProviderOwnerCandidates(page = 1, limit = 100, q?: string) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (q?.trim()) params.set('q', q.trim())
  return apiRequest<{
    data: ProviderOwnerCandidate[]
    meta: { page: number; limit: number; total: number }
  }>(`/providers/owner-candidates?${params.toString()}`)
}

export function getProvider(id: string) {
  return apiRequest<ProviderLogoResponse>(`/providers/${id}`)
}

export function createProvider(input: ProviderWriteInput) {
  return apiRequest<{ data: Provider }>('/providers', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateProvider(id: string, input: ProviderWriteInput) {
  return apiRequest<{ data: Provider }>(`/providers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}
