import { apiRequest } from './api'

export type ProviderStatus = 'PENDING' | 'APPROVED' | 'SUSPENDED'

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
  status: ProviderStatus
  createdAt: string
  updatedAt: string
}

export type ProviderLogoResponse = {
  data: Provider
  meta: { logoDownloadUrl: string | null }
}

export function providerStatusLabel(status: ProviderStatus): string {
  if (status === 'PENDING') return 'Pending'
  if (status === 'APPROVED') return 'Approved'
  return 'Suspended'
}

export function getMyProvider() {
  return apiRequest<ProviderLogoResponse>('/providers/me')
}

export type ProviderUpdateInput = {
  name?: string
  description?: string | null
  phone?: string | null
  whatsapp?: string | null
  email?: string | null
  website?: string | null
  address?: string | null
  city?: string | null
  country?: string | null
}

export function updateProvider(id: string, input: ProviderUpdateInput) {
  return apiRequest<{ data: Provider }>(`/providers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}
