import type { ProjectsService } from '../projects/index.js'
import { createProjectWorkersRepository } from '../project-workers/project-workers.repository.js'
import { createProjectTasksController } from './project-tasks.controller.js'
import { createProjectTasksRepository } from './project-tasks.repository.js'
import { createProjectTasksRouter, createWorkerProjectTasksRouter } from './project-tasks.routes.js'
import { createProjectTasksService, type ProjectTasksService } from './project-tasks.service.js'

export type ProjectTasksModuleDeps = {
  projectsService: ProjectsService
  service?: ProjectTasksService
}

export function buildProjectTasksService(projectsService: ProjectsService): ProjectTasksService {
  return createProjectTasksService({
    repository: createProjectTasksRepository(),
    projectsService,
    projectWorkersRepository: createProjectWorkersRepository(),
  })
}

export function createProjectTasksModule(deps: ProjectTasksModuleDeps) {
  const service = deps.service ?? buildProjectTasksService(deps.projectsService)
  const controller = createProjectTasksController(service)
  return createProjectTasksRouter({ controller })
}

export function createWorkerProjectTasksModule(deps: ProjectTasksModuleDeps) {
  const service = deps.service ?? buildProjectTasksService(deps.projectsService)
  const controller = createProjectTasksController(service)
  return createWorkerProjectTasksRouter({ controller })
}

export type { ProjectTasksService }
export type { ProjectTask } from './project-tasks.types.js'
