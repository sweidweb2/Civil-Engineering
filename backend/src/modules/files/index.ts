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

export function getFilesService(deps: FilesModuleDeps = {}): FilesService {
  if (!filesServiceSingleton) {
    const config = deps.config ?? loadConfig()
    const repository = createFilesRepository()
    const storage =
      deps.storage ?? (config.storage ? getStorageService(config) : unavailableStorage())
    const projectsService = deps.projectsService ?? getProjectsService()
    filesServiceSingleton = createFilesService({
      repository,
      storage,
      projectsService,
      config,
      enqueueDelete: deps.enqueueDelete ?? enqueueDeleteStorageObject,
    })
  }
  return filesServiceSingleton
}

export function createFilesModule(deps: FilesModuleDeps = {}) {
  const service = getFilesService(deps)
  const controller = createFilesController(service)
  return createFilesRoutes(controller)
}

export { filesDomain } from './files.domain.js'
export type { FilesService }
