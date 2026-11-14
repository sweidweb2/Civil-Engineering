import { apiRequest } from './api'

/** Fields shared by every owner-scoped image (listing, project, …). */
export type GalleryImageBase = {
  id: string
  storagePath: string
  url: string
  isMain: boolean
  displayOrder: number
  createdAt: string
  updatedAt: string
}

export type UploadGalleryImageInput = {
  file: File
  isMain?: boolean
  displayOrder?: number
  onProgress?: (percent: number) => void
}

export type UpdateGalleryImageInput = {
  isMain?: boolean
  displayOrder?: number
}

export type ReorderGalleryImagesInput = {
  imageIds: string[]
}

export type GalleryImagesApi<TImage extends GalleryImageBase> = {
  list: (ownerId: string) => Promise<{ data: TImage[] }>
  get: (imageId: string) => Promise<{ data: TImage }>
  upload: (ownerId: string, input: UploadGalleryImageInput) => Promise<{ data: TImage }>
  update: (imageId: string, input: UpdateGalleryImageInput) => Promise<{ data: TImage }>
  remove: (imageId: string) => Promise<void>
  reorder: (ownerId: string, input: ReorderGalleryImagesInput) => Promise<{ data: TImage[] }>
}

type GalleryImagesApiConfig = {
  /** e.g. `/listing-images` */
  basePath: string
  /** Owner collection segment, e.g. `listings` → `/listing-images/listings/:id/images` */
  ownerSegment: string
}

/** One REST client shape for every `<owner>-images` backend module. */
export function createGalleryImagesApi<TImage extends GalleryImageBase>({
  basePath,
  ownerSegment,
}: GalleryImagesApiConfig): GalleryImagesApi<TImage> {
  const ownerImagesPath = (ownerId: string) => `${basePath}/${ownerSegment}/${ownerId}/images`
  const imagePath = (imageId: string) => `${basePath}/images/${imageId}`

  return {
    list: (ownerId) => apiRequest<{ data: TImage[] }>(ownerImagesPath(ownerId)),

    get: (imageId) => apiRequest<{ data: TImage }>(imagePath(imageId)),

    upload: (ownerId, input) => {
      const formData = new FormData()
      formData.append('image', input.file)
      if (input.isMain !== undefined) {
        formData.append('isMain', String(input.isMain))
      }
      if (input.displayOrder !== undefined) {
        formData.append('displayOrder', String(input.displayOrder))
      }

      return apiRequest<{ data: TImage }>(ownerImagesPath(ownerId), {
        method: 'POST',
        body: formData,
        onUploadProgress: input.onProgress,
      })
    },

    update: (imageId, input) =>
      apiRequest<{ data: TImage }>(imagePath(imageId), {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),

    remove: (imageId) => apiRequest<void>(imagePath(imageId), { method: 'DELETE' }),

    reorder: (ownerId, input) =>
      apiRequest<{ data: TImage[] }>(`${ownerImagesPath(ownerId)}/reorder`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
  }
}
