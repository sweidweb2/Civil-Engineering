import type { AuthActor } from '../../authz/index.js'
import { conflict, validationError } from '../../errors/app-error.js'
import type { ProjectsService } from '../projects/index.js'
import type { ProjectProductivityRepository } from './project-productivity.repository.js'
import type { UpsertProductivityHoursBody } from './project-productivity.schema.js'
import type { ProjectProductivityHourEntry } from './project-productivity.types.js'

function utcToday(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Latest day a client may log: its *local* today can be up to UTC+14, i.e. one
 * calendar day ahead of UTC. Anything later is a future day and is rejected.
 */
function latestLoggableDay(): string {
  return new Date(Date.now() + 24 * 60 * 60_000).toISOString().slice(0, 10)
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
      const project = await assertProject(projectId, actor)
      if (project.status === 'CANCELLED') {
        throw conflict('Cannot log hours on a cancelled project', 'PROJECT_CANCELLED')
      }
      const date = body.date ?? utcToday()
      if (date > latestLoggableDay()) {
        throw validationError('Hours cannot be logged for a future day', {
          code: 'PRODUCTIVITY_FUTURE_DATE',
        })
      }
      return repository.upsert(projectId, date, body.hours, body.expectedUpdatedAt)
    },
  }
}
