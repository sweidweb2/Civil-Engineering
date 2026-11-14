import { randomUUID } from 'node:crypto'

import type { AuthActor } from '../../authz/index.js'
import type { AppConfig } from '../../config/index.js'
import { notFound, validationError } from '../../errors/app-error.js'
import { getLogger } from '../../logging/index.js'
import { resolvePublicOrPresignedUrl } from '../../storage/image-url.js'
import type { StorageService } from '../../storage/storage.service.js'
import {
  assertAllowedImageUpload,
  MAX_GALLERY_IMAGES,
  toWebpBuffer,
} from '../files/image-policy.js'
import type { ProjectsService } from '../projects/projects.service.js'
import type {
  ReorderProjectImagesBody,
  UpdateProjectImageBody,
  UploadProjectImageBody,
} from './project-images.schema.js'
import type { ProjectImagesRepository, ProjectImageWithUrl } from './project-images.types.js'

export type ProjectImagesService = {
  listProjectImages: (actor: AuthActor, projectId: string) => Promise<ProjectImageWithUrl[]>
  getProjectImage: (actor: AuthActor, imageId: string) => Promise<ProjectImageWithUrl>
  uploadProjectImage: (
    actor: AuthActor,
    projectId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    input: UploadProjectImageBody,
  ) => Promise<ProjectImageWithUrl>
  updateProjectImage: (
    actor: AuthActor,
    imageId: string,
    input: UpdateProjectImageBody,
  ) => Promise<ProjectImageWithUrl>
  deleteProjectImage: (actor: AuthActor, imageId: string) => Promise<void>
  reorderProjectImages: (
    actor: AuthActor,
    projectId: string,
    input: ReorderProjectImagesBody,
  ) => Promise<ProjectImageWithUrl[]>
  getMainImageUrl: (projectId: string) => Promise<string | null>
}

export type ProjectImagesServiceDeps = {
  repository: ProjectImagesRepository
  projectsService: ProjectsService
  storage: StorageService
  config: AppConfig
}

export function createProjectImagesService(deps: ProjectImagesServiceDeps): ProjectImagesService {
  const { repository, projectsService, storage, config } = deps

  async function assertProjectAccess(actor: AuthActor, projectId: string): Promise<void> {
    await projectsService.assertAccessible(projectId, actor)
  }

  function getImageUrl(storagePath: string): Promise<string> {
    return resolvePublicOrPresignedUrl({ config, storage, storagePath })
  }

  async function processAndUploadImage(
    buffer: Buffer,
    projectId: string,
    imageId: string,
  ): Promise<string> {
    const webpBuffer = await toWebpBuffer(buffer)

    const key = `projects/${projectId}/images/${imageId}.webp`

    await storage.putObject({
      key,
      body: webpBuffer,
      contentType: 'image/webp',
    })

    return key
  }

  return {
    async listProjectImages(actor, projectId) {
      await assertProjectAccess(actor, projectId)
      const images = await repository.findByProjectId(projectId)

      const imagesWithUrls = await Promise.all(
        images.map(async (image) => ({
          ...image,
          url: await getImageUrl(image.storagePath),
        })),
      )

      return imagesWithUrls
    },

    async getProjectImage(actor, imageId) {
      const image = await repository.findById(imageId)
      if (!image) {
        throw notFound('Image not found', 'IMAGE_NOT_FOUND')
      }

      await assertProjectAccess(actor, image.projectId)

      return {
        ...image,
        url: await getImageUrl(image.storagePath),
      }
    },

    async uploadProjectImage(actor, projectId, file, input) {
      await assertProjectAccess(actor, projectId)

      assertAllowedImageUpload(file)

      const currentCount = await repository.countByProjectId(projectId)
      if (currentCount >= MAX_GALLERY_IMAGES) {
        throw validationError(`Maximum ${MAX_GALLERY_IMAGES} images per project`)
      }

      const imageId = randomUUID().replace(/-/g, '')

      const storagePath = await processAndUploadImage(file.buffer, projectId, imageId)

      if (input.isMain) {
        await repository.unsetMainImage(projectId)
      }

      const displayOrder = input.displayOrder ?? currentCount

      const image = await repository.create({
        projectId,
        storagePath,
        isMain: input.isMain ?? false,
        displayOrder,
      })

      return {
        ...image,
        url: await getImageUrl(image.storagePath),
      }
    },

    async updateProjectImage(actor, imageId, input) {
      const image = await repository.findById(imageId)
      if (!image) {
        throw notFound('Image not found', 'IMAGE_NOT_FOUND')
      }

      await assertProjectAccess(actor, image.projectId)

      if (input.isMain) {
        await repository.unsetMainImage(image.projectId)
      }

      const updated = await repository.update(imageId, input)

      return {
        ...updated,
        url: await getImageUrl(updated.storagePath),
      }
    },

    async deleteProjectImage(actor, imageId) {
      const image = await repository.findById(imageId)
      if (!image) {
        throw notFound('Image not found', 'IMAGE_NOT_FOUND')
      }

      await assertProjectAccess(actor, image.projectId)

      await repository.delete(imageId)

      try {
        await storage.deleteObject(image.storagePath)
      } catch (error) {
        getLogger().error(
          { err: error, imageId, storagePath: image.storagePath },
          'failed to delete project image from storage',
        )
      }
    },

    async reorderProjectImages(actor, projectId, input) {
      await assertProjectAccess(actor, projectId)

      const images = await repository.findByProjectId(projectId)
      const imageMap = new Map(images.map((img) => [img.id, img]))

      const invalidIds = input.imageIds.filter((id) => !imageMap.has(id))
      if (invalidIds.length > 0) {
        throw validationError(`Invalid image IDs: ${invalidIds.join(', ')}`)
      }

      await Promise.all(
        input.imageIds.map((id, index) => repository.update(id, { displayOrder: index })),
      )

      const updatedImages = await repository.findByProjectId(projectId)

      return Promise.all(
        updatedImages.map(async (image) => ({
          ...image,
          url: await getImageUrl(image.storagePath),
        })),
      )
    },

    async getMainImageUrl(projectId) {
      const mainImage = await repository.findMainImageByProjectId(projectId)
      if (!mainImage) {
        return null
      }
      return getImageUrl(mainImage.storagePath)
    },
  }
}
