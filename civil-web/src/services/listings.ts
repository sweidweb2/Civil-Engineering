import { apiRequest } from './api'

export type ListingType = 'MATERIAL' | 'EQUIPMENT' | 'SERVICE'
export type ListingStatus = 'ACTIVE' | 'INACTIVE'
export type RentalUnit = 'HOUR' | 'DAY' | 'WEEK' | 'MONTH'

export type Listing = {
  id: string
  providerId: string
  providerName: string
  categoryId: string
  categoryName: string
  type: ListingType
  name: string
  description: string | null
  brand: string | null
  unit: string
  currency: string
  price: string
  rentalPrice: string | null
  rentalUnit: RentalUnit | null
  quantityAvailable: string | null
  status: ListingStatus
  createdAt: string
  updatedAt: string
}

export type ListingTypeCounts = {
  MATERIAL: number
  EQUIPMENT: number
  SERVICE: number
}

export type PaginatedListings = {
  data: Listing[]
  meta: {
    page: number
    limit: number
    total: number
    typeCounts: ListingTypeCounts
  }
}

export type ListingWriteInput = {
  providerId: string
  categoryId: string
  type: ListingType
  name: string
  description?: string | null
  brand?: string | null
  unit: string
  currency: string
  price: string
  rentalPrice?: string | null
  rentalUnit?: RentalUnit | null
  quantityAvailable?: string | null
  status?: ListingStatus
}

export const LISTING_TYPES: ListingType[] = ['MATERIAL', 'EQUIPMENT', 'SERVICE']
export const RENTAL_UNITS: RentalUnit[] = ['HOUR', 'DAY', 'WEEK', 'MONTH']

export function isListingType(value: string): value is ListingType {
  return value === 'MATERIAL' || value === 'EQUIPMENT' || value === 'SERVICE'
}

export function isRentalUnit(value: string): value is RentalUnit {
  return value === 'HOUR' || value === 'DAY' || value === 'WEEK' || value === 'MONTH'
}

export function listingTypeLabel(type: ListingType): string {
  if (type === 'MATERIAL') return 'Material'
  if (type === 'EQUIPMENT') return 'Equipment'
  return 'Service'
}

export function rentalUnitLabel(unit: RentalUnit): string {
  if (unit === 'HOUR') return 'Hour'
  if (unit === 'DAY') return 'Day'
  if (unit === 'WEEK') return 'Week'
  return 'Month'
}

export function listListings(
  page = 1,
  limit = 8,
  filters?: {
    q?: string
    type?: ListingType
    status?: ListingStatus
    providerId?: string
    categoryId?: string
    counts?: boolean
  },
) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (filters?.q) params.set('q', filters.q)
  if (filters?.type) params.set('type', filters.type)
  if (filters?.status) params.set('status', filters.status)
  if (filters?.providerId) params.set('providerId', filters.providerId)
  if (filters?.categoryId) params.set('categoryId', filters.categoryId)
  if (filters?.counts === false) params.set('counts', 'false')
  return apiRequest<PaginatedListings>(`/listings?${params.toString()}`)
}

export function createListing(input: ListingWriteInput) {
  return apiRequest<{ data: Listing }>('/listings', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateListing(id: string, input: Partial<ListingWriteInput>) {
  return apiRequest<{ data: Listing }>(`/listings/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function deleteListing(id: string) {
  return apiRequest<{ data: { outcome: 'deleted' | 'hidden' } }>(`/listings/${id}`, { method: 'DELETE' })
}
