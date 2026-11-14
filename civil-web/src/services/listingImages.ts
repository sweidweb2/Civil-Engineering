import {
  createGalleryImagesApi,
  type GalleryImageBase,
  type ReorderGalleryImagesInput,
  type UpdateGalleryImageInput,
  type UploadGalleryImageInput,
} from './galleryImages'

export type ListingImage = GalleryImageBase & { listingId: string }

export type UploadListingImageInput = UploadGalleryImageInput
export type UpdateListingImageInput = UpdateGalleryImageInput
export type ReorderListingImagesInput = ReorderGalleryImagesInput

export const listingImagesApi = createGalleryImagesApi<ListingImage>({
  basePath: '/listing-images',
  ownerSegment: 'listings',
})

export const listListingImages = listingImagesApi.list
export const getListingImage = listingImagesApi.get
export const uploadListingImage = listingImagesApi.upload
export const updateListingImage = listingImagesApi.update
export const deleteListingImage = listingImagesApi.remove
export const reorderListingImages = listingImagesApi.reorder
