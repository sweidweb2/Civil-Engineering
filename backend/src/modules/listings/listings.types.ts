import type { ListingStatus, ListingType, RentalUnit } from './listings.schema.js'

export type Listing = {
  id: string
  providerId: string | null
  providerName: string | null
  categoryId: string | null
  categoryName: string | null
  categoryNameAr: string | null
  /** Derived from the linked category kind when a category is set. */
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
  /** Present on list/detail when a main gallery image exists and storage can resolve a URL. */
  mainImageUrl?: string | null
}

/** Fields snapshotted into project step input values for CATEGORY fields. */
export type ListingSnapshot = {
  id: string
  name: string
  type: string | null
  categoryId: string | null
  brand: string | null
  unit: string | null
  currency: string | null
  price: string | null
  priceMin: string | null
  priceMax: string | null
  rentalPrice: string | null
  rentalUnit: string | null
  providerId: string | null
  status: string
  description: string | null
}

export type ListingTypeCounts = {
  MATERIAL: number
  EQUIPMENT: number
  SERVICE: number
}

export type ListingStatusCounts = {
  ACTIVE: number
  INACTIVE: number
}

export type PaginatedListings = {
  data: Listing[]
  meta: {
    page: number
    limit: number
    total: number
    /** Always present (cheap status groupBy). Provider-scoped for provider callers. */
    statusCounts: ListingStatusCounts
    /** Zeroed when the caller passes `counts=false` (skips the category join). */
    typeCounts: ListingTypeCounts
  }
}
