import type { ProjectsService } from '../projects/projects.service.js'
import { createProjectSteppersController } from './project-steppers.controller.js'
import { createProjectSteppersRepository } from './project-steppers.repository.js'
import { createProjectSteppersService } from './project-steppers.service.js'

export function createProjectSteppersControllerForProjects(
  projectsService: Pick<ProjectsService, 'assertAccessible'>,
) {
  const repository = createProjectSteppersRepository()
  const service = createProjectSteppersService(repository, projectsService)
  return createProjectSteppersController(service)
}

export type { ProjectSteppersController } from './project-steppers.controller.js'
