import { apiRequest } from './api'

export type ListingImage = {
  id: string
  listingId: string
  storagePath: string
  url: string
  isMain: boolean
  displayOrder: number
  createdAt: string
  updatedAt: string
}

export type UploadListingImageInput = {
  file: File
  isMain?: boolean
  displayOrder?: number
  onProgress?: (percent: number) => void
}

export type UpdateListingImageInput = {
  isMain?: boolean
  displayOrder?: number
}

export type ReorderListingImagesInput = {
  imageIds: string[]
}

export function listListingImages(listingId: string) {
  return apiRequest<{ data: ListingImage[] }>(`/listing-images/listings/${listingId}/images`)
}

export function getListingImage(imageId: string) {
  return apiRequest<{ data: ListingImage }>(`/listing-images/images/${imageId}`)
}

export async function uploadListingImage(
  listingId: string,
  input: UploadListingImageInput,
): Promise<{ data: ListingImage }> {
  const formData = new FormData()
  formData.append('image', input.file)
  if (input.isMain !== undefined) {
    formData.append('isMain', String(input.isMain))
  }
  if (input.displayOrder !== undefined) {
    formData.append('displayOrder', String(input.displayOrder))
  }

  return apiRequest<{ data: ListingImage }>(`/listing-images/listings/${listingId}/images`, {
    method: 'POST',
    body: formData,
    onUploadProgress: input.onProgress,
  })
}

export function updateListingImage(imageId: string, input: UpdateListingImageInput) {
  return apiRequest<{ data: ListingImage }>(`/listing-images/images/${imageId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function deleteListingImage(imageId: string) {
  return apiRequest<void>(`/listing-images/images/${imageId}`, {
    method: 'DELETE',
  })
}

export function reorderListingImages(listingId: string, input: ReorderListingImagesInput) {
  return apiRequest<{ data: ListingImage[] }>(
    `/listing-images/listings/${listingId}/images/reorder`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  )
}
