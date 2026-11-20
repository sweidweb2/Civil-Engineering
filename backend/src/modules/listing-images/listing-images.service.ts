import type { AuthActor } from '../../authz/index.js'
import type { AppConfig } from '../../config/index.js'
import type { StorageService } from '../../storage/index.js'
import {
  createOwnerGalleryService,
  type ImageUploadFile,
  type OwnerGalleryImage,
  type OwnerGalleryImageWithUrl,
  type OwnerGalleryRepository,
} from '../files/index.js'
import type { ListingsService } from '../listings/index.js'
import type {
  ReorderListingImagesBody,
  UpdateListingImageBody,
  UploadListingImageBody,
  UploadListingImagesBatchBody,
} from './listing-images.schema.js'
import type {
  ListingImage,
  ListingImagesRepository,
  ListingImageWithUrl,
} from './listing-images.types.js'

export type ListingImagesService = {
  listListingImages: (actor: AuthActor, listingId: string) => Promise<ListingImageWithUrl[]>
  getListingImage: (actor: AuthActor, imageId: string) => Promise<ListingImageWithUrl>
  uploadListingImage: (
    actor: AuthActor,
    listingId: string,
    file: ImageUploadFile & { originalname?: string },
    input: UploadListingImageBody,
  ) => Promise<ListingImageWithUrl>
  uploadListingImagesBatch: (
    actor: AuthActor,
    listingId: string,
    files: Array<ImageUploadFile & { originalname?: string }>,
    input: UploadListingImagesBatchBody,
  ) => Promise<ListingImageWithUrl[]>
  updateListingImage: (
    actor: AuthActor,
    imageId: string,
    input: UpdateListingImageBody,
  ) => Promise<ListingImageWithUrl>
  deleteListingImage: (actor: AuthActor, imageId: string) => Promise<void>
  reorderListingImages: (
    actor: AuthActor,
    listingId: string,
    input: ReorderListingImagesBody,
  ) => Promise<ListingImageWithUrl[]>
  getMainImageUrl: (listingId: string) => Promise<string | null>
}

export type ListingImagesServiceDeps = {
  repository: ListingImagesRepository
  listingsService: ListingsService
  storage: StorageService
  config: AppConfig
}

function toListingImage(image: OwnerGalleryImage): ListingImage {
  return {
    id: image.id,
    listingId: image.ownerId,
    storagePath: image.storagePath,
    isMain: image.isMain,
    displayOrder: image.displayOrder,
    createdAt: image.createdAt,
    updatedAt: image.updatedAt,
  }
}

function toListingImageWithUrl(image: OwnerGalleryImageWithUrl): ListingImageWithUrl {
  return { ...toListingImage(image), url: image.url }
}

function adaptRepository(repository: ListingImagesRepository): OwnerGalleryRepository {
  return {
    findByOwnerId: async (ownerId) =>
      (await repository.findByListingId(ownerId)).map((image) => ({
        ...image,
        ownerId: image.listingId,
      })),
    findById: async (id) => {
      const image = await repository.findById(id)
      return image ? { ...image, ownerId: image.listingId } : null
    },
    countByOwnerId: (ownerId) => repository.countByListingId(ownerId),
    create: async (data) => {
      const image = await repository.create({
        listingId: data.ownerId,
        storagePath: data.storagePath,
        isMain: data.isMain,
        displayOrder: data.displayOrder,
      })
      return { ...image, ownerId: image.listingId }
    },
    createAtomic: async (data) => {
      const image = await repository.createAtomic({
        listingId: data.ownerId,
        storagePath: data.storagePath,
        isMain: data.isMain,
        displayOrder: data.displayOrder,
        maxImages: data.maxImages,
        autoMainIfEmpty: data.autoMainIfEmpty,
      })
      return { ...image, ownerId: image.listingId }
    },
    update: async (id, data) => {
      const image = await repository.update(id, data)
      return { ...image, ownerId: image.listingId }
    },
    setMainAtomic: async (ownerId, imageId, opts) => {
      const image = await repository.setMainAtomic(ownerId, imageId, opts)
      return { ...image, ownerId: image.listingId }
    },
    reorderAtomic: (ownerId, orderedIds) => repository.reorderAtomic(ownerId, orderedIds),
    delete: (id) => repository.delete(id),
    unsetMainImage: (ownerId) => repository.unsetMainImage(ownerId),
    findMainImageByOwnerId: async (ownerId) => {
      const image = await repository.findMainImageByListingId(ownerId)
      return image ? { ...image, ownerId: image.listingId } : null
    },
  }
}

export function createListingImagesService(deps: ListingImagesServiceDeps): ListingImagesService {
  const gallery = createOwnerGalleryService({
    repository: adaptRepository(deps.repository),
    storage: deps.storage,
    config: deps.config,
    policy: {
      keyPrefix: 'listings',
      notFoundCode: 'LISTING_IMAGE_NOT_FOUND',
      logLabel: 'listing image',
      autoMain: true,
      assertCanView: async (actor, ownerId) => {
        await deps.listingsService.assertAccessible(ownerId, actor)
      },
      assertCanManage: async (actor, ownerId) => {
        await deps.listingsService.assertManageable(ownerId, actor)
      },
    },
  })

  return {
    listListingImages: async (actor, listingId) =>
      (await gallery.list(actor, listingId)).map(toListingImageWithUrl),
    getListingImage: async (actor, imageId) =>
      toListingImageWithUrl(await gallery.get(actor, imageId)),
    uploadListingImage: async (actor, listingId, file, input) =>
      toListingImageWithUrl(await gallery.upload(actor, listingId, file, input)),
    uploadListingImagesBatch: async (actor, listingId, files, input) =>
      (
        await gallery.uploadMany(actor, listingId, files, {
          firstIsMain: input.firstIsMain,
        })
      ).map(toListingImageWithUrl),
    updateListingImage: async (actor, imageId, input) =>
      toListingImageWithUrl(await gallery.update(actor, imageId, input)),
    deleteListingImage: (actor, imageId) => gallery.remove(actor, imageId),
    reorderListingImages: async (actor, listingId, input) =>
      (await gallery.reorder(actor, listingId, input)).map(toListingImageWithUrl),
    getMainImageUrl: (listingId) => gallery.getMainImageUrl(listingId),
  }
}
