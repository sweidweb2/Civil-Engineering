import type { Listing, ListingStatus } from '@/services/listings'

export type ListingFormValues = {
  name: string
  categoryId: string
  unit: string
  currency: string
  /** Fixed price, or a min–max range (backend accepts exactly one mode). */
  isPriceRange: boolean
  price: string
  priceMin: string
  priceMax: string
  status: ListingStatus
  description: string
  brand: string
  quantityAvailable: string
  isForRent: boolean
  rentalPrice: string
  rentalUnit: string
}

export const EMPTY_LISTING_FORM: ListingFormValues = {
  name: '',
  categoryId: '',
  unit: '',
  currency: 'USD',
  isPriceRange: false,
  price: '',
  priceMin: '',
  priceMax: '',
  status: 'ACTIVE',
  description: '',
  brand: '',
  quantityAvailable: '',
  isForRent: false,
  rentalPrice: '',
  rentalUnit: '',
}

export function formFromListing(listing: Listing): ListingFormValues {
  return {
    name: listing.name,
    categoryId: listing.categoryId ?? '',
    unit: listing.unit ?? '',
    currency: listing.currency ?? 'USD',
    isPriceRange: listing.price == null && listing.priceMin != null && listing.priceMax != null,
    price: listing.price ?? '',
    priceMin: listing.priceMin ?? '',
    priceMax: listing.priceMax ?? '',
    status: listing.status,
    description: listing.description ?? '',
    brand: listing.brand ?? '',
    quantityAvailable: listing.quantityAvailable ?? '',
    isForRent: listing.rentalPrice != null && listing.rentalUnit != null,
    rentalPrice: listing.rentalPrice ?? '',
    rentalUnit: listing.rentalUnit ?? '',
  }
}
