import { apiRequest } from './api'

export type ListingType = 'MATERIAL' | 'EQUIPMENT' | 'SERVICE'
export type ListingStatus = 'ACTIVE' | 'INACTIVE'
export type RentalUnit = 'HOUR' | 'DAY' | 'WEEK' | 'MONTH'

export type Listing = {
  id: string
  providerId: string | null
  providerName: string | null
  categoryId: string | null
  categoryName: string | null
  categoryNameAr: string | null
  type: ListingType | null
  name: string
  description: string | null
  brand: string | null
  unit: string | null
  currency: string | null
  price: string | null
  priceMin: string | null
  priceMax: string | null
  rentalPrice: string | null
  rentalUnit: RentalUnit | null
  quantityAvailable: string | null
  status: ListingStatus
  createdAt: string
  updatedAt: string
  mainImageUrl?: string | null
  /** Stable storage key of the main image: use as the image cache key (URL is re-signed). */
  mainImageKey?: string | null
}

export type ListingStatusCounts = {
  ACTIVE: number
  INACTIVE: number
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
    statusCounts?: ListingStatusCounts
    typeCounts?: ListingTypeCounts
  }
}

export const RENTAL_UNITS: RentalUnit[] = ['HOUR', 'DAY', 'WEEK', 'MONTH']

export function isRentalUnit(value: string): value is RentalUnit {
  return value === 'HOUR' || value === 'DAY' || value === 'WEEK' || value === 'MONTH'
}

export type ListingWriteInput = {
  name: string
  providerId?: string | null
  categoryId?: string | null
  description?: string | null
  brand?: string | null
  unit?: string | null
  currency?: string | null
  price?: string | null
  priceMin?: string | null
  priceMax?: string | null
  rentalPrice?: string | null
  rentalUnit?: RentalUnit | null
  quantityAvailable?: string | null
  status?: ListingStatus
}

export function getListingById(id: string) {
  return apiRequest<{ data: Listing }>(`/listings/${id}`)
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
  return apiRequest<{ data: { outcome: 'deleted' | 'hidden' } }>(`/listings/${id}`, {
    method: 'DELETE',
  })
}

export function formatListingPrice(
  listing: Pick<Listing, 'currency' | 'price' | 'priceMin' | 'priceMax' | 'unit'>,
): string {
  const currency = listing.currency?.trim() || ''
  const unit = listing.unit?.trim()
  const suffix = unit ? ` / ${unit}` : ''
  if (listing.price != null && listing.price !== '') {
    return `${currency} ${listing.price}${suffix}`.trim()
  }
  if (listing.priceMin != null && listing.priceMax != null) {
    return `${currency} ${listing.priceMin}–${listing.priceMax}${suffix}`.trim()
  }
  return '—'
}

export function listListings(
  page = 1,
  limit = 20,
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
