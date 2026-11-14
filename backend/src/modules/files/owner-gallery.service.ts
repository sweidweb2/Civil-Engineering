import { randomUUID } from 'node:crypto'

import type { AuthActor } from '../../authz/index.js'
import type { AppConfig } from '../../config/index.js'
import { notFound, validationError } from '../../errors/app-error.js'
import { getLogger } from '../../logging/index.js'
import { resolvePublicOrPresignedUrl } from '../../storage/image-url.js'
import type { StorageService } from '../../storage/storage.service.js'
import { assertAllowedImageUpload, MAX_GALLERY_IMAGES, toWebpBuffer } from './image-policy.js'

/** Owner-scoped gallery row with a stable `ownerId` (projectId or listingId). */
export type OwnerGalleryImage = {
  id: string
  ownerId: string
  storagePath: string
  isMain: boolean
  displayOrder: number
  createdAt: Date
  updatedAt: Date
}

export type OwnerGalleryImageWithUrl = OwnerGalleryImage & { url: string }

export type OwnerGalleryRepository = {
  findByOwnerId: (ownerId: string) => Promise<OwnerGalleryImage[]>
  findById: (id: string) => Promise<OwnerGalleryImage | null>
  countByOwnerId: (ownerId: string) => Promise<number>
  create: (data: {
    ownerId: string
    storagePath: string
    isMain?: boolean
    displayOrder?: number
  }) => Promise<OwnerGalleryImage>
  update: (
    id: string,
    data: { isMain?: boolean; displayOrder?: number },
  ) => Promise<OwnerGalleryImage>
  delete: (id: string) => Promise<void>
  unsetMainImage: (ownerId: string) => Promise<void>
  findMainImageByOwnerId: (ownerId: string) => Promise<OwnerGalleryImage | null>
}

export type OwnerGalleryPolicy = {
  /** Storage key segment, e.g. `projects` → `projects/{id}/images/{imageId}.webp` */
  keyPrefix: string
  notFoundCode: string
  logLabel: string
  /**
   * When true: first upload becomes main if none set; deleting the main image
   * promotes the next remaining image.
   */
  autoMain: boolean
  assertCanView: (actor: AuthActor, ownerId: string) => Promise<void>
  assertCanManage: (actor: AuthActor, ownerId: string) => Promise<void>
}

export type OwnerGalleryService = {
  list: (actor: AuthActor, ownerId: string) => Promise<OwnerGalleryImageWithUrl[]>
  get: (actor: AuthActor, imageId: string) => Promise<OwnerGalleryImageWithUrl>
  upload: (
    actor: AuthActor,
    ownerId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    input: { isMain?: boolean; displayOrder?: number },
  ) => Promise<OwnerGalleryImageWithUrl>
  update: (
    actor: AuthActor,
    imageId: string,
    input: { isMain?: boolean; displayOrder?: number },
  ) => Promise<OwnerGalleryImageWithUrl>
  remove: (actor: AuthActor, imageId: string) => Promise<void>
  reorder: (
    actor: AuthActor,
    ownerId: string,
    input: { imageIds: string[] },
  ) => Promise<OwnerGalleryImageWithUrl[]>
  getMainImageUrl: (ownerId: string) => Promise<string | null>
}

export type OwnerGalleryServiceDeps = {
  repository: OwnerGalleryRepository
  policy: OwnerGalleryPolicy
  storage: StorageService
  config: AppConfig
}

/** Shared gallery use-cases for project/listing (and future) owner image modules. */
export function createOwnerGalleryService(deps: OwnerGalleryServiceDeps): OwnerGalleryService {
  const { repository, policy, storage, config } = deps

  function getImageUrl(storagePath: string): Promise<string> {
    return resolvePublicOrPresignedUrl({ config, storage, storagePath })
  }

  async function withUrl(image: OwnerGalleryImage): Promise<OwnerGalleryImageWithUrl> {
    return { ...image, url: await getImageUrl(image.storagePath) }
  }

  async function processAndUploadImage(
    buffer: Buffer,
    ownerId: string,
    imageId: string,
  ): Promise<string> {
    const webpBuffer = await toWebpBuffer(buffer)
    const key = `${policy.keyPrefix}/${ownerId}/images/${imageId}.webp`
    await storage.putObject({
      key,
      body: webpBuffer,
      contentType: 'image/webp',
    })
    return key
  }

  return {
    async list(actor, ownerId) {
      await policy.assertCanView(actor, ownerId)
      const images = await repository.findByOwnerId(ownerId)
      return Promise.all(images.map((image) => withUrl(image)))
    },

    async get(actor, imageId) {
      const image = await repository.findById(imageId)
      if (!image) throw notFound('Image not found', policy.notFoundCode)
      await policy.assertCanView(actor, image.ownerId)
      return withUrl(image)
    },

    async upload(actor, ownerId, file, input) {
      await policy.assertCanManage(actor, ownerId)
      assertAllowedImageUpload(file)

      const currentCount = await repository.countByOwnerId(ownerId)
      if (currentCount >= MAX_GALLERY_IMAGES) {
        throw validationError(`Maximum ${MAX_GALLERY_IMAGES} images per ${policy.keyPrefix}`)
      }

      const imageId = randomUUID().replace(/-/g, '')
      const storagePath = await processAndUploadImage(file.buffer, ownerId, imageId)
      const isMain = policy.autoMain
        ? input.isMain === true || currentCount === 0
        : (input.isMain ?? false)

      if (isMain) {
        await repository.unsetMainImage(ownerId)
      }

      const image = await repository.create({
        ownerId,
        storagePath,
        isMain,
        displayOrder: input.displayOrder ?? currentCount,
      })

      return withUrl(image)
    },

    async update(actor, imageId, input) {
      const image = await repository.findById(imageId)
      if (!image) throw notFound('Image not found', policy.notFoundCode)
      await policy.assertCanManage(actor, image.ownerId)

      if (input.isMain) {
        await repository.unsetMainImage(image.ownerId)
      }

      const updated = await repository.update(imageId, input)
      return withUrl(updated)
    },

    async remove(actor, imageId) {
      const image = await repository.findById(imageId)
      if (!image) throw notFound('Image not found', policy.notFoundCode)
      await policy.assertCanManage(actor, image.ownerId)

      await repository.delete(imageId)

      if (policy.autoMain && image.isMain) {
        const remaining = await repository.findByOwnerId(image.ownerId)
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
          `failed to delete ${policy.logLabel} from storage`,
        )
      }
    },

    async reorder(actor, ownerId, input) {
      await policy.assertCanManage(actor, ownerId)

      const images = await repository.findByOwnerId(ownerId)
      const imageMap = new Map(images.map((img) => [img.id, img]))
      const invalidIds = input.imageIds.filter((id) => !imageMap.has(id))
      if (invalidIds.length > 0) {
        throw validationError(`Invalid image IDs: ${invalidIds.join(', ')}`)
      }

      await Promise.all(
        input.imageIds.map((id, index) => repository.update(id, { displayOrder: index })),
      )

      const updatedImages = await repository.findByOwnerId(ownerId)
      return Promise.all(updatedImages.map((image) => withUrl(image)))
    },

    async getMainImageUrl(ownerId) {
      const mainImage = await repository.findMainImageByOwnerId(ownerId)
      if (!mainImage) return null
      return getImageUrl(mainImage.storagePath)
    },
  }
}
