import type { AppConfig } from '../../config/index.js'
import { loadConfig } from '../../config/index.js'
import { enqueueDeleteStorageObject } from '../../jobs/index.js'
import { getStorageService, type StorageService } from '../../storage/index.js'
import { getProjectsService, type ProjectsService } from '../projects/index.js'
import { createFilesController } from './files.controller.js'
import { createFilesRepository } from './files.repository.js'
import { createFilesRoutes } from './files.routes.js'
import { createFilesService, type FilesService } from './files.service.js'

export type FilesModuleDeps = {
  config?: AppConfig
  storage?: StorageService
  projectsService?: ProjectsService
  enqueueDelete?: (payload: { fileId: string; key: string }) => Promise<void>
}

function unavailableStorage(): StorageService {
  const fail = async () => {
    throw new Error('Storage is not configured (STORAGE_* env vars required)')
  }
  return {
    bucket: 'unconfigured',
    presignPut: fail,
    presignGet: fail,
    headObject: fail,
    putObject: fail,
    deleteObject: async () => undefined,
  }
}

let filesServiceSingleton: FilesService | null = null

/** Builds a fresh service. The composition root calls this once per app. */
export function buildFilesService(deps: FilesModuleDeps = {}): FilesService {
  const config = deps.config ?? loadConfig()
  const storage =
    deps.storage ?? (config.storage ? getStorageService(config) : unavailableStorage())
  return createFilesService({
    repository: createFilesRepository(),
    storage,
    projectsService: deps.projectsService ?? getProjectsService(),
    config,
    enqueueDelete: deps.enqueueDelete ?? enqueueDeleteStorageObject,
  })
}

/** Standalone/test singleton (first caller's deps win). The app uses `composition-root.ts`. */
export function getFilesService(deps: FilesModuleDeps = {}): FilesService {
  filesServiceSingleton ??= buildFilesService(deps)
  return filesServiceSingleton
}

export function createFilesModule(deps: FilesModuleDeps & { service?: FilesService } = {}) {
  const service = deps.service ?? getFilesService(deps)
  const controller = createFilesController(service)
  return createFilesRoutes(controller)
}

export type { FilesService }
export {
  createOwnerGalleryService,
  type OwnerGalleryImage,
  type OwnerGalleryImageWithUrl,
  type OwnerGalleryPolicy,
  type OwnerGalleryRepository,
  type OwnerGalleryService,
} from './owner-gallery.service.js'
