import type { Listing, ListingStatus, ListingType } from '@/services/listings'

export type ListingForm = {
  name: string
  type: ListingType
  providerId: string
  categoryId: string
  unit: string
  currency: string
  price: string
  status: ListingStatus
  description: string
  brand: string
  quantityAvailable: string
  rentalPrice: string
  rentalUnit: string
}

export const EMPTY_LISTING_FORM: ListingForm = {
  name: '',
  type: 'MATERIAL',
  providerId: '',
  categoryId: '',
  unit: '',
  currency: 'USD',
  price: '',
  status: 'ACTIVE',
  description: '',
  brand: '',
  quantityAvailable: '',
  rentalPrice: '',
  rentalUnit: '',
}

export function formFromListing(listing: Listing): ListingForm {
  return {
    name: listing.name,
    type: listing.type,
    providerId: listing.providerId,
    categoryId: listing.categoryId,
    unit: listing.unit,
    currency: listing.currency,
    price: listing.price,
    status: listing.status,
    description: listing.description ?? '',
    brand: listing.brand ?? '',
    quantityAvailable: listing.quantityAvailable ?? '',
    rentalPrice: listing.rentalPrice ?? '',
    rentalUnit: listing.rentalUnit ?? '',
  }
}
