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

export type PaginatedOwnerCandidates = {
  data: ProviderOwnerCandidate[]
  meta: {
    page: number
    limit: number
    total: number
  }
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
