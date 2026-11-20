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
import type { ProjectsService } from '../projects/index.js'
import type {
  ReorderProjectImagesBody,
  UpdateProjectImageBody,
  UploadProjectImageBody,
  UploadProjectImagesBatchBody,
} from './project-images.schema.js'
import type {
  ProjectImage,
  ProjectImagesRepository,
  ProjectImageWithUrl,
} from './project-images.types.js'

export type ProjectImagesService = {
  listProjectImages: (actor: AuthActor, projectId: string) => Promise<ProjectImageWithUrl[]>
  getProjectImage: (actor: AuthActor, imageId: string) => Promise<ProjectImageWithUrl>
  uploadProjectImage: (
    actor: AuthActor,
    projectId: string,
    file: ImageUploadFile & { originalname?: string },
    input: UploadProjectImageBody,
  ) => Promise<ProjectImageWithUrl>
  uploadProjectImagesBatch: (
    actor: AuthActor,
    projectId: string,
    files: Array<ImageUploadFile & { originalname?: string }>,
    input: UploadProjectImagesBatchBody,
  ) => Promise<ProjectImageWithUrl[]>
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

function toProjectImage(image: OwnerGalleryImage): ProjectImage {
  return {
    id: image.id,
    projectId: image.ownerId,
    storagePath: image.storagePath,
    isMain: image.isMain,
    displayOrder: image.displayOrder,
    createdAt: image.createdAt,
    updatedAt: image.updatedAt,
  }
}

function toProjectImageWithUrl(image: OwnerGalleryImageWithUrl): ProjectImageWithUrl {
  return { ...toProjectImage(image), url: image.url }
}

function adaptRepository(repository: ProjectImagesRepository): OwnerGalleryRepository {
  return {
    findByOwnerId: async (ownerId) =>
      (await repository.findByProjectId(ownerId)).map((image) => ({
        ...image,
        ownerId: image.projectId,
      })),
    findById: async (id) => {
      const image = await repository.findById(id)
      return image ? { ...image, ownerId: image.projectId } : null
    },
    countByOwnerId: (ownerId) => repository.countByProjectId(ownerId),
    create: async (data) => {
      const image = await repository.create({
        projectId: data.ownerId,
        storagePath: data.storagePath,
        isMain: data.isMain,
        displayOrder: data.displayOrder,
      })
      return { ...image, ownerId: image.projectId }
    },
    createAtomic: async (data) => {
      const image = await repository.createAtomic({
        projectId: data.ownerId,
        storagePath: data.storagePath,
        isMain: data.isMain,
        displayOrder: data.displayOrder,
        maxImages: data.maxImages,
        autoMainIfEmpty: data.autoMainIfEmpty,
      })
      return { ...image, ownerId: image.projectId }
    },
    update: async (id, data) => {
      const image = await repository.update(id, data)
      return { ...image, ownerId: image.projectId }
    },
    setMainAtomic: async (ownerId, imageId, opts) => {
      const image = await repository.setMainAtomic(ownerId, imageId, opts)
      return { ...image, ownerId: image.projectId }
    },
    reorderAtomic: (ownerId, orderedIds) => repository.reorderAtomic(ownerId, orderedIds),
    delete: (id) => repository.delete(id),
    unsetMainImage: (ownerId) => repository.unsetMainImage(ownerId),
    findMainImageByOwnerId: async (ownerId) => {
      const image = await repository.findMainImageByProjectId(ownerId)
      return image ? { ...image, ownerId: image.projectId } : null
    },
  }
}

export function createProjectImagesService(deps: ProjectImagesServiceDeps): ProjectImagesService {
  const gallery = createOwnerGalleryService({
    repository: adaptRepository(deps.repository),
    storage: deps.storage,
    config: deps.config,
    policy: {
      keyPrefix: 'projects',
      notFoundCode: 'IMAGE_NOT_FOUND',
      logLabel: 'project image',
      autoMain: false,
      assertCanView: async (actor, ownerId) => {
        await deps.projectsService.assertAccessible(ownerId, actor)
      },
      assertCanManage: async (actor, ownerId) => {
        await deps.projectsService.assertAccessible(ownerId, actor)
      },
    },
  })

  return {
    listProjectImages: async (actor, projectId) =>
      (await gallery.list(actor, projectId)).map(toProjectImageWithUrl),
    getProjectImage: async (actor, imageId) =>
      toProjectImageWithUrl(await gallery.get(actor, imageId)),
    uploadProjectImage: async (actor, projectId, file, input) =>
      toProjectImageWithUrl(await gallery.upload(actor, projectId, file, input)),
    uploadProjectImagesBatch: async (actor, projectId, files, input) =>
      (
        await gallery.uploadMany(actor, projectId, files, {
          firstIsMain: input.firstIsMain,
        })
      ).map(toProjectImageWithUrl),
    updateProjectImage: async (actor, imageId, input) =>
      toProjectImageWithUrl(await gallery.update(actor, imageId, input)),
    deleteProjectImage: (actor, imageId) => gallery.remove(actor, imageId),
    reorderProjectImages: async (actor, projectId, input) =>
      (await gallery.reorder(actor, projectId, input)).map(toProjectImageWithUrl),
    getMainImageUrl: (projectId) => gallery.getMainImageUrl(projectId),
  }
}
