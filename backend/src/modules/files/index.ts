import type { AppConfig } from '../../config/index.js'
import { loadConfig } from '../../config/index.js'
import { deleteStorageObject } from '../../jobs/index.js'
import { getStorageOrUnavailable, type StorageService } from '../../storage/index.js'
import { getProjectsService, type ProjectsService } from '../projects/index.js'
import { createFilesController } from './files.controller.js'
import { createFilesRepository } from './files.repository.js'
import { createFilesRoutes } from './files.routes.js'
import { createFilesService, type FilesService } from './files.service.js'

export type FilesModuleDeps = {
  config?: AppConfig
  storage?: StorageService
  projectsService?: ProjectsService
  deleteStorageObject?: (payload: { fileId: string; key: string }) => Promise<void>
}

let filesServiceSingleton: FilesService | null = null

/** Builds a fresh service. The composition root calls this once per app. */
export function buildFilesService(deps: FilesModuleDeps = {}): FilesService {
  const config = deps.config ?? loadConfig()
  const storage = getStorageOrUnavailable(config, deps.storage)
  return createFilesService({
    repository: createFilesRepository(),
    storage,
    projectsService: deps.projectsService ?? getProjectsService(),
    config,
    deleteStorageObject: deps.deleteStorageObject ?? deleteStorageObject,
  })
}

/** Standalone/test singleton (first caller's deps win). The app uses `composition-root.ts`. */
export function getFilesService(deps: FilesModuleDeps = {}): FilesService {
  filesServiceSingleton ??= buildFilesService(deps)
  return filesServiceSingleton
}

export function createFilesModule(deps: { service: FilesService }) {
  const controller = createFilesController(deps.service)
  return createFilesRoutes(controller)
}

export type { FilesService }
export {
  assertAllowedImageUpload,
  createImageUpload,
  encodeImageToWebp,
  type ImageUploadFile,
  isAllowedImageMime,
  MAX_BRAND_IMAGE_BYTES,
  MAX_GALLERY_IMAGES,
  readUploadBytes,
  toWebpBuffer,
} from './image-policy.js'
export { linkUploadedFile } from './link-uploaded-file.js'
export {
  createOwnerGalleryService,
  type OwnerGalleryImage,
  type OwnerGalleryImageWithUrl,
  type OwnerGalleryPolicy,
  type OwnerGalleryRepository,
  type OwnerGalleryService,
} from './owner-gallery.service.js'
export { purgeExpiredIdempotencyRecords } from './purge-idempotency.js'
