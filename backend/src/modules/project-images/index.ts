import type { AppConfig } from '../../config/index.js'
import { loadConfig } from '../../config/index.js'
import { getStorageOrUnavailable, type StorageService } from '../../storage/index.js'
import type { ProjectsService } from '../projects/index.js'
import { createProjectImagesController } from './project-images.controller.js'
import { createProjectImagesRepository } from './project-images.repository.js'
import { createProjectImagesRouter } from './project-images.routes.js'
import { createProjectImagesService } from './project-images.service.js'

export type ProjectImagesModuleDeps = {
  projectsService: ProjectsService
  config?: AppConfig
  storage?: StorageService
}

export function createProjectImagesModule(deps: ProjectImagesModuleDeps) {
  const config = deps.config ?? loadConfig()
  const storage = getStorageOrUnavailable(config, deps.storage)
  const service = createProjectImagesService({
    repository: createProjectImagesRepository(),
    projectsService: deps.projectsService,
    storage,
    config,
  })
  return createProjectImagesRouter({
    controller: createProjectImagesController({ service }),
  })
}

export * from './project-images.controller.js'
export * from './project-images.repository.js'
export * from './project-images.routes.js'
export * from './project-images.schema.js'
export * from './project-images.service.js'
export * from './project-images.types.js'
