import type { Listing, ListingStatus } from '@/services/listings'

export type ListingForm = {
  name: string
  providerId: string
  categoryId: string
  unit: string
  currency: string
  hasPriceRange: boolean
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

export const EMPTY_LISTING_FORM: ListingForm = {
  name: '',
  providerId: '',
  categoryId: '',
  unit: '',
  currency: 'USD',
  hasPriceRange: false,
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

export function formFromListing(listing: Listing): ListingForm {
  const hasPriceRange =
    listing.priceMin != null && listing.priceMax != null && listing.price == null
  return {
    name: listing.name,
    providerId: listing.providerId ?? '',
    categoryId: listing.categoryId ?? '',
    unit: listing.unit ?? '',
    currency: listing.currency ?? 'USD',
    hasPriceRange,
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
