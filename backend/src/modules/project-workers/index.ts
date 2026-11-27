import { createNotificationsRepository } from '../notifications/notifications.repository.js'
import type { ProjectsService } from '../projects/index.js'
import { createProjectWorkersController } from './project-workers.controller.js'
import { createProjectWorkersRepository } from './project-workers.repository.js'
import { createProjectWorkersRouter, createWorkerProjectsRouter } from './project-workers.routes.js'
import {
  createProjectWorkersService,
  type ProjectWorkersService,
} from './project-workers.service.js'
import type { ProjectWorkersNotifyGateway } from './project-workers.types.js'

export type ProjectWorkersModuleDeps = {
  projectsService: ProjectsService
  service?: ProjectWorkersService
  notify?: ProjectWorkersNotifyGateway
}

function defaultNotifyGateway(): ProjectWorkersNotifyGateway {
  const repository = createNotificationsRepository()
  return {
    async notify(input) {
      await repository.create({
        senderId: input.senderId,
        receiverId: input.receiverId,
        type: 'INFO',
        title: input.title,
        message: input.message,
      })
    },
  }
}

export function buildProjectWorkersService(
  projectsService: ProjectsService,
  notify?: ProjectWorkersNotifyGateway,
): ProjectWorkersService {
  return createProjectWorkersService({
    repository: createProjectWorkersRepository(),
    projectsService,
    notify: notify ?? defaultNotifyGateway(),
  })
}

export function createProjectWorkersModule(deps: ProjectWorkersModuleDeps) {
  const service = deps.service ?? buildProjectWorkersService(deps.projectsService, deps.notify)
  const controller = createProjectWorkersController(service)
  return createProjectWorkersRouter({ controller })
}

export function createWorkerProjectsModule(deps: ProjectWorkersModuleDeps) {
  const service = deps.service ?? buildProjectWorkersService(deps.projectsService, deps.notify)
  const controller = createProjectWorkersController(service)
  return createWorkerProjectsRouter({ controller })
}

export type { ProjectWorkersService }
export type { ProjectWorker, WorkerProjectSummary } from './project-workers.types.js'
