import type { AuthActor } from '../../authz/index.js'
import type { ProjectsService } from '../projects/index.js'
import type { ProjectProductivityRepository } from './project-productivity.repository.js'
import type { UpsertProductivityHoursBody } from './project-productivity.schema.js'
import type { ProjectProductivityHourEntry } from './project-productivity.types.js'

function utcToday(): string {
  return new Date().toISOString().slice(0, 10)
}

export type ProjectProductivityService = {
  list: (projectId: string, actor: AuthActor) => Promise<ProjectProductivityHourEntry[]>
  upsert: (
    projectId: string,
    body: UpsertProductivityHoursBody,
    actor: AuthActor,
  ) => Promise<ProjectProductivityHourEntry>
}

export type ProjectProductivityServiceDeps = {
  repository: ProjectProductivityRepository
  projectsService: ProjectsService
}

export function createProjectProductivityService(
  deps: ProjectProductivityServiceDeps,
): ProjectProductivityService {
  const { repository, projectsService } = deps

  async function assertProject(projectId: string, actor: AuthActor) {
    return projectsService.assertAccessible(projectId, actor)
  }

  return {
    async list(projectId, actor) {
      await assertProject(projectId, actor)
      return repository.listByProjectId(projectId)
    },

    async upsert(projectId, body, actor) {
      await assertProject(projectId, actor)
      const date = body.date ?? utcToday()
      return repository.upsert(projectId, date, body.hours)
    },
  }
}
