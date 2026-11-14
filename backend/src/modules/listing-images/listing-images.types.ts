export type ListingImage = {
  id: string
  listingId: string
  storagePath: string
  isMain: boolean
  displayOrder: number
  createdAt: Date
  updatedAt: Date
}

export type CreateListingImageData = {
  listingId: string
  storagePath: string
  isMain?: boolean
  displayOrder?: number
}

export type UpdateListingImageData = {
  isMain?: boolean
  displayOrder?: number
}

export type ListingImageWithUrl = ListingImage & {
  url: string
}

export type CreateListingImageAtomicInput = CreateListingImageData & {
  maxImages: number
  autoMainIfEmpty: boolean
}

export type ListingImagesRepository = {
  findByListingId: (listingId: string) => Promise<ListingImage[]>
  findById: (id: string) => Promise<ListingImage | null>
  countByListingId: (listingId: string) => Promise<number>
  create: (data: CreateListingImageData) => Promise<ListingImage>
  createAtomic: (data: CreateListingImageAtomicInput) => Promise<ListingImage>
  update: (id: string, data: UpdateListingImageData) => Promise<ListingImage>
  setMainAtomic: (listingId: string, imageId: string) => Promise<ListingImage>
  reorderAtomic: (listingId: string, orderedIds: string[]) => Promise<void>
  delete: (id: string) => Promise<void>
  unsetMainImage: (listingId: string) => Promise<void>
  findMainImageByListingId: (listingId: string) => Promise<ListingImage | null>
}
