import { optimizeIfImage } from '../lib/optimizeImage'
import { apiRequest } from './api'
import type { PickedFile } from './filePicker'
import { appendImagePart } from './galleryImages'

export type ProviderStatus = 'PENDING' | 'APPROVED' | 'SUSPENDED'

/** PROVIDER user who manages a company (`/providers/me` resolves by this link). */
export type ProviderOwner = {
  id: string
  email: string
  displayName: string | null
}

export type Provider = {
  id: string
  ownerUserId: string | null
  owner?: ProviderOwner | null
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
  status: ProviderStatus
  createdAt: string
  updatedAt: string
}

export type ProviderLogoResponse = {
  data: Provider
  meta: { logoDownloadUrl: string | null }
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
  phone?: string | null
  whatsapp?: string | null
  email?: string | null
  website?: string | null
  address?: string | null
  city?: string | null
  country?: string | null
  status?: ProviderStatus
}

export type ProviderUpdateInput = Partial<ProviderWriteInput> & {
  name?: string
}

export const PROVIDER_STATUS_OPTIONS: { value: ProviderStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'SUSPENDED', label: 'Suspended' },
]

export function providerStatusLabel(status: ProviderStatus): string {
  return PROVIDER_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status
}

export function getMyProvider() {
  return apiRequest<ProviderLogoResponse>('/providers/me')
}

export function listProviders(
  page = 1,
  limit = 20,
  q?: string,
  status?: ProviderStatus,
  counts = true,
) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (q) params.set('q', q)
  if (status) params.set('status', status)
  if (!counts) params.set('counts', 'false')
  return apiRequest<PaginatedProviders>(`/providers?${params.toString()}`)
}

/** Active PROVIDER users not yet linked to a company (admin only). */
export function listProviderOwnerCandidates(q?: string, limit = 100) {
  const params = new URLSearchParams({ page: '1', limit: String(limit) })
  if (q) params.set('q', q)
  return apiRequest<{
    data: ProviderOwner[]
    meta: { page: number; limit: number; total: number }
  }>(`/providers/owner-candidates?${params.toString()}`)
}

export function ownerLabel(owner: ProviderOwner) {
  return owner.displayName ? `${owner.displayName} · ${owner.email}` : owner.email
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

export function updateProvider(id: string, input: ProviderUpdateInput) {
  return apiRequest<{ data: Provider }>(`/providers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export async function uploadProviderLogo(id: string, picked: PickedFile) {
  const optimized = await optimizeIfImage(picked)
  const form = new FormData()
  await appendImagePart(form, 'image', optimized)
  return apiRequest<ProviderLogoResponse>(`/providers/${id}/logo/upload`, {
    method: 'POST',
    body: form,
  })
}

export function clearProviderLogo(id: string) {
  return apiRequest<ProviderLogoResponse>(`/providers/${id}/logo`, { method: 'DELETE' })
}
