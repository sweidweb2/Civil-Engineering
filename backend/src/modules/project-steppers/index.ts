import type { FilesService } from '../files/files.service.js'
import { getInputTypesService } from '../input-types/index.js'
import type { ProjectsService } from '../projects/projects.service.js'
import { createProjectSteppersController } from './project-steppers.controller.js'
import { createProjectSteppersRepository } from './project-steppers.repository.js'
import { createProjectSteppersService } from './project-steppers.service.js'

/** Lazy files gateway — avoids circular init with files ↔ projects. */
function createFilesGateway(): Pick<FilesService, 'requireReadyAttachment' | 'softDelete'> {
  return {
    async requireReadyAttachment(fileId, entityType, entityId) {
      const { getFilesService } = await import('../files/index.js')
      return getFilesService().requireReadyAttachment(fileId, entityType, entityId)
    },
    async softDelete(actor, fileId) {
      const { getFilesService } = await import('../files/index.js')
      return getFilesService().softDelete(actor, fileId)
    },
  }
}

export function createProjectSteppersControllerForProjects(
  projectsService: Pick<ProjectsService, 'assertAccessible'>,
) {
  const repository = createProjectSteppersRepository()
  const service = createProjectSteppersService(
    repository,
    projectsService,
    getInputTypesService(),
    createFilesGateway(),
  )
  return createProjectSteppersController(service)
}

export type { ProjectSteppersController } from './project-steppers.controller.js'
