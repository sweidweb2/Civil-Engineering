import { randomUUID } from 'node:crypto'
import sharp from 'sharp'

import type { AuthActor } from '../../authz/index.js'
import type { AppConfig } from '../../config/index.js'
import { notFound, validationError } from '../../errors/app-error.js'
import { getLogger } from '../../logging/index.js'
import { cacheKeys, readThroughCache } from '../../redis/index.js'
import type { StorageService } from '../../storage/storage.service.js'
import { assertMimeMatchesContent } from '../files/mime-sniff.js'
import type { ListingsService } from '../listings/listings.service.js'
import type {
  ReorderListingImagesBody,
  UpdateListingImageBody,
  UploadListingImageBody,
} from './listing-images.schema.js'
import type { ListingImagesRepository, ListingImageWithUrl } from './listing-images.types.js'

const MAX_IMAGES_PER_LISTING = 15
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

export type ListingImagesService = {
  listListingImages: (actor: AuthActor, listingId: string) => Promise<ListingImageWithUrl[]>
  getListingImage: (actor: AuthActor, imageId: string) => Promise<ListingImageWithUrl>
  uploadListingImage: (
    actor: AuthActor,
    listingId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    input: UploadListingImageBody,
  ) => Promise<ListingImageWithUrl>
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

export function createListingImagesService(deps: ListingImagesServiceDeps): ListingImagesService {
  const { repository, listingsService, storage, config } = deps

  async function assertCanView(actor: AuthActor, listingId: string): Promise<void> {
    await listingsService.assertAccessible(listingId, actor)
  }

  async function assertCanManage(actor: AuthActor, listingId: string): Promise<void> {
    await listingsService.assertManageable(listingId, actor)
  }

  async function getImageUrl(storagePath: string): Promise<string> {
    const publicBase = config.storage?.publicBaseUrl?.replace(/\/$/, '')
    if (publicBase) {
      return `${publicBase}/${storagePath.replace(/^\//, '')}`
    }
    const expiresInSec = config.storage?.downloadUrlTtlSec ?? config.storageDownloadUrlTtlSec
    const cacheTtlSec = Math.max(30, Math.min(expiresInSec - 60, 240))
    return readThroughCache(cacheKeys.storagePresignGet(storagePath), cacheTtlSec, () =>
      storage.presignGet({
        key: storagePath,
        expiresInSec,
      }),
    )
  }

  async function processAndUploadImage(
    buffer: Buffer,
    listingId: string,
    imageId: string,
  ): Promise<string> {
    const webpBuffer = await sharp(buffer).webp({ quality: 85, effort: 4 }).toBuffer()
    const key = `listings/${listingId}/images/${imageId}.webp`
    await storage.putObject({
      key,
      body: webpBuffer,
      contentType: 'image/webp',
    })
    return key
  }

  async function withUrl(image: {
    id: string
    listingId: string
    storagePath: string
    isMain: boolean
    displayOrder: number
    createdAt: Date
    updatedAt: Date
  }): Promise<ListingImageWithUrl> {
    return {
      ...image,
      url: await getImageUrl(image.storagePath),
    }
  }

  return {
    async listListingImages(actor, listingId) {
      await assertCanView(actor, listingId)
      const images = await repository.findByListingId(listingId)
      return Promise.all(images.map((image) => withUrl(image)))
    },

    async getListingImage(actor, imageId) {
      const image = await repository.findById(imageId)
      if (!image) throw notFound('Image not found', 'LISTING_IMAGE_NOT_FOUND')
      await assertCanView(actor, image.listingId)
      return withUrl(image)
    },

    async uploadListingImage(actor, listingId, file, input) {
      await assertCanManage(actor, listingId)

      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        throw validationError('Invalid file type. Allowed types: JPG, JPEG, PNG, WEBP')
      }

      try {
        assertMimeMatchesContent(file.mimetype, file.buffer, { imagesOnly: true })
      } catch {
        throw validationError('File content does not match the declared image type')
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        throw validationError(
          `File size exceeds maximum of ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`,
        )
      }

      const currentCount = await repository.countByListingId(listingId)
      if (currentCount >= MAX_IMAGES_PER_LISTING) {
        throw validationError(`Maximum ${MAX_IMAGES_PER_LISTING} images per listing`)
      }

      const imageId = randomUUID().replace(/-/g, '')
      const storagePath = await processAndUploadImage(file.buffer, listingId, imageId)
      const isMain = input.isMain === true || currentCount === 0

      if (isMain) {
        await repository.unsetMainImage(listingId)
      }

      const image = await repository.create({
        listingId,
        storagePath,
        isMain,
        displayOrder: input.displayOrder ?? currentCount,
      })

      return withUrl(image)
    },

    async updateListingImage(actor, imageId, input) {
      const image = await repository.findById(imageId)
      if (!image) throw notFound('Image not found', 'LISTING_IMAGE_NOT_FOUND')
      await assertCanManage(actor, image.listingId)

      if (input.isMain) {
        await repository.unsetMainImage(image.listingId)
      }

      const updated = await repository.update(imageId, input)
      return withUrl(updated)
    },

    async deleteListingImage(actor, imageId) {
      const image = await repository.findById(imageId)
      if (!image) throw notFound('Image not found', 'LISTING_IMAGE_NOT_FOUND')
      await assertCanManage(actor, image.listingId)

      await repository.delete(imageId)

      if (image.isMain) {
        const remaining = await repository.findByListingId(image.listingId)
        const next = remaining[0]
        if (next) {
          await repository.update(next.id, { isMain: true })
        }
      }

      try {
        await storage.deleteObject(image.storagePath)
      } catch (error) {
        getLogger().error(
          { err: error, imageId, storagePath: image.storagePath },
          'failed to delete listing image from storage',
        )
      }
    },

    async reorderListingImages(actor, listingId, input) {
      await assertCanManage(actor, listingId)

      const images = await repository.findByListingId(listingId)
      const imageMap = new Map(images.map((img) => [img.id, img]))
      const invalidIds = input.imageIds.filter((id) => !imageMap.has(id))
      if (invalidIds.length > 0) {
        throw validationError(`Invalid image IDs: ${invalidIds.join(', ')}`)
      }

      await Promise.all(
        input.imageIds.map((id, index) => repository.update(id, { displayOrder: index })),
      )

      const updatedImages = await repository.findByListingId(listingId)
      return Promise.all(updatedImages.map((image) => withUrl(image)))
    },

    async getMainImageUrl(listingId) {
      const mainImage = await repository.findMainImageByListingId(listingId)
      if (!mainImage) return null
      return getImageUrl(mainImage.storagePath)
    },
  }
}
