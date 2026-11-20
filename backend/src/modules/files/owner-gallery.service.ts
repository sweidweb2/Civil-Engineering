import { randomUUID } from 'node:crypto'

import type { AuthActor } from '../../authz/index.js'
import type { AppConfig } from '../../config/index.js'
import { isUniqueConflictError, notFound, validationError } from '../../errors/app-error.js'
import { getRequestLogger } from '../../logging/index.js'
import { resolvePublicOrPresignedUrl, type StorageService } from '../../storage/index.js'
import {
  assertAllowedImageUpload,
  encodeImageToWebp,
  type ImageUploadFile,
  MAX_GALLERY_IMAGES,
} from './image-policy.js'

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

export type OwnerGalleryImageWithUrl = OwnerGalleryImage & { url: string | null }

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
  createAtomic: (data: {
    ownerId: string
    storagePath: string
    isMain?: boolean
    displayOrder?: number
    maxImages: number
    autoMainIfEmpty: boolean
  }) => Promise<OwnerGalleryImage>
  update: (
    id: string,
    data: { isMain?: boolean; displayOrder?: number },
  ) => Promise<OwnerGalleryImage>
  setMainAtomic: (
    ownerId: string,
    imageId: string,
    opts?: { displayOrder?: number },
  ) => Promise<OwnerGalleryImage>
  /** Apply displayOrder updates for one owner in a single transaction. */
  reorderAtomic: (ownerId: string, orderedIds: string[]) => Promise<void>
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
    file: ImageUploadFile & { originalname?: string },
    input: { isMain?: boolean; displayOrder?: number },
  ) => Promise<OwnerGalleryImageWithUrl>
  uploadMany: (
    actor: AuthActor,
    ownerId: string,
    files: Array<ImageUploadFile & { originalname?: string }>,
    options?: { firstIsMain?: boolean },
  ) => Promise<OwnerGalleryImageWithUrl[]>
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

function mapGalleryUniqueConflict(error: unknown): never {
  if (isUniqueConflictError(error)) {
    throw validationError('Only one main image is allowed')
  }
  throw error
}

/** Shared gallery use-cases for project/listing (and future) owner image modules. */
export function createOwnerGalleryService(deps: OwnerGalleryServiceDeps): OwnerGalleryService {
  const { repository, policy, storage, config } = deps

  async function getImageUrl(storagePath: string): Promise<string | null> {
    try {
      return await resolvePublicOrPresignedUrl({ config, storage, storagePath })
    } catch {
      return null
    }
  }

  async function withUrl(image: OwnerGalleryImage): Promise<OwnerGalleryImageWithUrl> {
    const url = await getImageUrl(image.storagePath)
    return { ...image, url }
  }

  async function uploadCore(
    ownerId: string,
    file: ImageUploadFile & { originalname?: string },
    input: { isMain?: boolean; displayOrder?: number },
  ): Promise<OwnerGalleryImageWithUrl> {
    await assertAllowedImageUpload(file)

    const imageId = randomUUID().replace(/-/g, '')
    const storagePath = `${policy.keyPrefix}/${ownerId}/images/${imageId}.webp`
    const webpBuffer = await encodeImageToWebp(file)

    // DB first (count + main under row lock) so concurrent uploads cannot overrun the cap
    // or create dual mains; R2 put is compensated if it fails after insert.
    let image: OwnerGalleryImage
    try {
      image = await repository.createAtomic({
        ownerId,
        storagePath,
        isMain: input.isMain,
        displayOrder: input.displayOrder,
        maxImages: MAX_GALLERY_IMAGES,
        autoMainIfEmpty: policy.autoMain,
      })
    } catch (error) {
      mapGalleryUniqueConflict(error)
    }

    try {
      await storage.putObject({
        key: storagePath,
        body: webpBuffer,
        contentType: 'image/webp',
      })
    } catch (error) {
      try {
        await repository.delete(image.id)
      } catch (compensateError) {
        getRequestLogger().error(
          { err: compensateError, imageId: image.id, storagePath },
          `failed to roll back ${policy.logLabel} row after storage put failure`,
        )
      }
      throw error
    }

    return withUrl(image)
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

    async uploadMany(actor, ownerId, files, options = {}) {
      if (files.length === 0) return []
      if (files.length > MAX_GALLERY_IMAGES) {
        throw validationError(`At most ${MAX_GALLERY_IMAGES} images can be uploaded at once`)
      }
      await policy.assertCanManage(actor, ownerId)
      const uploaded: OwnerGalleryImageWithUrl[] = []
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index]
        if (!file) continue
        uploaded.push(
          await uploadCore(ownerId, file, {
            isMain: Boolean(options.firstIsMain) && index === 0,
          }),
        )
      }
      return uploaded
    },

    async upload(actor, ownerId, file, input) {
      await policy.assertCanManage(actor, ownerId)
      return uploadCore(ownerId, file, input)
    },

    async update(actor, imageId, input) {
      const image = await repository.findById(imageId)
      if (!image) throw notFound('Image not found', policy.notFoundCode)
      await policy.assertCanManage(actor, image.ownerId)

      if (input.isMain === true) {
        try {
          const updated = await repository.setMainAtomic(image.ownerId, imageId, {
            displayOrder: input.displayOrder,
          })
          return withUrl(updated)
        } catch (error) {
          mapGalleryUniqueConflict(error)
        }
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
          try {
            await repository.setMainAtomic(image.ownerId, next.id)
          } catch (error) {
            mapGalleryUniqueConflict(error)
          }
        }
      }

      try {
        await storage.deleteObject(image.storagePath)
      } catch (error) {
        getRequestLogger().error(
          { err: error, imageId, storagePath: image.storagePath },
          `failed to delete ${policy.logLabel} from storage`,
        )
      }
    },

    async reorder(actor, ownerId, input) {
      await policy.assertCanManage(actor, ownerId)

      const images = await repository.findByOwnerId(ownerId)
      const existingIds = images.map((img) => img.id)
      const uniqueIncoming = new Set(input.imageIds)

      if (uniqueIncoming.size !== input.imageIds.length) {
        throw validationError('Reorder imageIds must not contain duplicates')
      }
      if (input.imageIds.length !== existingIds.length) {
        throw validationError('Reorder imageIds must include every image exactly once')
      }
      const existingSet = new Set(existingIds)
      const invalidIds = input.imageIds.filter((id) => !existingSet.has(id))
      if (invalidIds.length > 0) {
        throw validationError(`Invalid image IDs: ${invalidIds.join(', ')}`)
      }

      await repository.reorderAtomic(ownerId, input.imageIds)

      const updatedImages = await repository.findByOwnerId(ownerId)
      return Promise.all(updatedImages.map((image) => withUrl(image)))
    },

    async getMainImageUrl(ownerId) {
      const main = await repository.findMainImageByOwnerId(ownerId)
      if (!main) return null
      return getImageUrl(main.storagePath)
    },
  }
}
