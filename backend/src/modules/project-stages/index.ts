import type { ProjectsService } from '../projects/index.js'
import { createProjectStagesController } from './project-stages.controller.js'
import { createProjectStagesRepository } from './project-stages.repository.js'
import { createProjectStagesRouter } from './project-stages.routes.js'
import { createProjectStagesService, type ProjectStagesService } from './project-stages.service.js'

export type ProjectStagesModuleDeps = {
  projectsService: ProjectsService
  service?: ProjectStagesService
}

export function buildProjectStagesService(projectsService: ProjectsService): ProjectStagesService {
  return createProjectStagesService({
    repository: createProjectStagesRepository(),
    projectsService,
  })
}

export function createProjectStagesModule(deps: ProjectStagesModuleDeps) {
  const service = deps.service ?? buildProjectStagesService(deps.projectsService)
  const controller = createProjectStagesController(service)
  return createProjectStagesRouter({ controller })
}

export type { ProjectStagesService }
export * from './project-stages.completeness.js'
export * from './project-stages.schema.js'
export * from './project-stages.types.js'
