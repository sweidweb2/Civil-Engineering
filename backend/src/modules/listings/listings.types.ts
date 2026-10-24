import type { ListingStatus, ListingType, RentalUnit } from './listings.schema.js'

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
  /** Present on list/detail when a main gallery image exists and storage can resolve a URL. */
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
