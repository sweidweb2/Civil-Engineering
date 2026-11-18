import type { AppLocale } from '@/stores/localeStore'

import { apiRequest } from './api'

/** Prefer Arabic category name when locale is `ar` and set; otherwise the stored name. */
export function localizedListingCategoryName(
  listing: { categoryName: string | null; categoryNameAr?: string | null },
  locale: AppLocale,
): string | null {
  if (locale === 'ar') {
    const arabic = listing.categoryNameAr?.trim()
    if (arabic) return arabic
  }
  return listing.categoryName
}

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
  /** Derived from category kind when set. */
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

export type BulkPriceDirection = 'increase' | 'decrease'
export type BulkPriceMode = 'percentage' | 'amount'

export type BulkPriceAdjustInput = {
  providerId?: string
  direction: BulkPriceDirection
  mode: BulkPriceMode
  value: string
}

export type BulkPriceAdjustResult = {
  updated: number
  skipped: number
}

export function bulkAdjustListingPrices(input: BulkPriceAdjustInput) {
  return apiRequest<{ data: BulkPriceAdjustResult }>('/listings/bulk-price-adjust', {
    method: 'POST',
    body: JSON.stringify(input),
    // Large catalogs can take longer than the default 30s; abort mid-flight risks double-apply.
    timeoutMs: 90_000,
  })
}

export type ListingImportRow = {
  name: string
  category?: string
  description?: string
  brand?: string
  unit?: string
  currency?: string
  price?: string
  price_min?: string
  price_max?: string
  rental_price?: string
  rental_unit?: string
  quantity_available?: string
  status?: string
}

export type ImportListingsInput = {
  providerId?: string
  rows: ListingImportRow[]
}

export type ImportListingsResult = {
  created: number
  skipped: number
  errors: Array<{ row: number; reason: string }>
}

export function importListings(input: ImportListingsInput) {
  return apiRequest<{ data: ImportListingsResult }>('/listings/import', {
    method: 'POST',
    body: JSON.stringify(input),
    timeoutMs: 90_000,
  })
}
