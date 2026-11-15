import type { Listing, ListingStatus } from '@/services/listings'

export type ListingFormValues = {
  name: string
  categoryId: string
  unit: string
  currency: string
  price: string
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
  price: '',
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
    price: listing.price ?? listing.priceMin ?? '',
    status: listing.status,
    description: listing.description ?? '',
    brand: listing.brand ?? '',
    quantityAvailable: listing.quantityAvailable ?? '',
    isForRent: listing.rentalPrice != null && listing.rentalUnit != null,
    rentalPrice: listing.rentalPrice ?? '',
    rentalUnit: listing.rentalUnit ?? '',
  }
}
