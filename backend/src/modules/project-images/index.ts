import type { AppConfig } from '../../config/index.js'
import { loadConfig } from '../../config/index.js'
import { getStorageService, type StorageService } from '../../storage/index.js'
import { getProjectsService, type ProjectsService } from '../projects/index.js'
import { createProjectImagesController } from './project-images.controller.js'
import { createProjectImagesRepository } from './project-images.repository.js'
import { createProjectImagesRouter } from './project-images.routes.js'
import { createProjectImagesService } from './project-images.service.js'

export type ProjectImagesModuleDeps = {
  config?: AppConfig
  storage?: StorageService
  projectsService?: ProjectsService
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

export function createProjectImagesModule(deps: ProjectImagesModuleDeps = {}) {
  const config = deps.config ?? loadConfig()
  const repository = createProjectImagesRepository()
  const storage =
    deps.storage ?? (config.storage ? getStorageService(config) : unavailableStorage())
  const projectsService = deps.projectsService ?? getProjectsService()
  const service = createProjectImagesService({
    repository,
    projectsService,
    storage,
    config,
  })
  const controller = createProjectImagesController({ service })
  return createProjectImagesRouter({ controller })
}

export * from './project-images.types.js'
export * from './project-images.schema.js'
export * from './project-images.repository.js'
export * from './project-images.service.js'
export * from './project-images.controller.js'
export * from './project-images.routes.js'
