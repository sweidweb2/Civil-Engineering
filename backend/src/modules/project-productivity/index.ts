import type { ProjectsService } from '../projects/index.js'
import { createProjectProductivityController } from './project-productivity.controller.js'
import { createProjectProductivityRepository } from './project-productivity.repository.js'
import { createProjectProductivityRouter } from './project-productivity.routes.js'
import {
  createProjectProductivityService,
  type ProjectProductivityService,
} from './project-productivity.service.js'

export type ProjectProductivityModuleDeps = {
  projectsService: ProjectsService
  service?: ProjectProductivityService
}

export function buildProjectProductivityService(
  projectsService: ProjectsService,
): ProjectProductivityService {
  return createProjectProductivityService({
    repository: createProjectProductivityRepository(),
    projectsService,
  })
}

export function createProjectProductivityModule(deps: ProjectProductivityModuleDeps) {
  const service = deps.service ?? buildProjectProductivityService(deps.projectsService)
  const controller = createProjectProductivityController(service)
  return createProjectProductivityRouter({ controller })
}

export type { ProjectProductivityService }
export * from './project-productivity.schema.js'
export * from './project-productivity.types.js'
