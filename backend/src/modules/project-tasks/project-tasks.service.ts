import { assertOwner, assertOwnerOrAdmin, type AuthActor } from '../../authz/index.js'
import { forbidden, notFound, unauthorized, validationError } from '../../errors/app-error.js'
import type { ProjectWorkersRepository } from '../project-workers/project-workers.repository.js'
import type { ProjectsService } from '../projects/index.js'
import type { Project } from '../projects/projects.types.js'
import type { ProjectTasksRepository } from './project-tasks.repository.js'
import type {
  CreateProjectTaskBody,
  ListProjectTasksQuery,
  UpdateProjectTaskBody,
  WorkerUpdateTaskBody,
} from './project-tasks.schema.js'
import type { ProjectTask } from './project-tasks.types.js'

function isReadOnlyProject(project: Project): boolean {
  return (
    Boolean(project.archivedAt) || project.status === 'COMPLETED' || project.status === 'CANCELLED'
  )
}

function assertMutable(project: Project) {
  if (isReadOnlyProject(project)) {
    throw forbidden('This project is read-only')
  }
}

function pageMeta(total: number, page: number, limit: number) {
  return { total, page, limit, totalPages: Math.ceil(total / limit) }
}

export type ProjectTasksService = {
  listByProject: (
    projectId: string,
    query: ListProjectTasksQuery,
    actor: AuthActor,
  ) => Promise<{ data: ProjectTask[]; meta: ReturnType<typeof pageMeta> }>
  create: (projectId: string, body: CreateProjectTaskBody, actor: AuthActor) => Promise<ProjectTask>
  update: (
    projectId: string,
    taskId: string,
    body: UpdateProjectTaskBody,
    actor: AuthActor,
  ) => Promise<ProjectTask>
  remove: (projectId: string, taskId: string, actor: AuthActor) => Promise<void>
  listMine: (
    projectId: string,
    query: ListProjectTasksQuery,
    actor: AuthActor,
  ) => Promise<{ data: ProjectTask[]; meta: ReturnType<typeof pageMeta> }>
  updateMineStatus: (
    projectId: string,
    taskId: string,
    body: WorkerUpdateTaskBody,
    actor: AuthActor,
  ) => Promise<ProjectTask>
}

export type ProjectTasksServiceDeps = {
  repository: ProjectTasksRepository
  projectsService: ProjectsService
  projectWorkersRepository: ProjectWorkersRepository
}

export function createProjectTasksService(deps: ProjectTasksServiceDeps): ProjectTasksService {
  const { repository, projectsService, projectWorkersRepository } = deps

  async function loadOwnerProject(projectId: string, actor: AuthActor, mutate: boolean) {
    const project = await projectsService.assertAccessible(projectId, actor)
    if (mutate) {
      assertOwner(actor.id, project.ownerId)
      assertMutable(project)
    } else {
      assertOwnerOrAdmin(actor, project.ownerId)
    }
    return project
  }

  async function assertAssigneeOk(
    projectId: string,
    assigneeProjectWorkerId: string | null | undefined,
  ) {
    if (assigneeProjectWorkerId === undefined || assigneeProjectWorkerId === null) return
    const pw = await repository.findProjectWorker(assigneeProjectWorkerId)
    if (!pw || pw.projectId !== projectId) {
      throw validationError('Assignee is not on this project')
    }
    if (pw.status !== 'ACCEPTED') {
      throw validationError('Assignee must have accepted the project invite')
    }
  }

  return {
    async listByProject(projectId, query, actor) {
      await loadOwnerProject(projectId, actor, false)
      const page = query.page ?? 1
      const limit = query.limit ?? 20
      const { rows, total } = await repository.findManyByProject(projectId, query)
      return { data: rows, meta: pageMeta(total, page, limit) }
    },

    async create(projectId, body, actor) {
      await loadOwnerProject(projectId, actor, true)
      await assertAssigneeOk(projectId, body.assigneeProjectWorkerId)
      return repository.create(projectId, actor.id, body)
    },

    async update(projectId, taskId, body, actor) {
      await loadOwnerProject(projectId, actor, true)
      const task = await repository.findById(taskId)
      if (!task || task.projectId !== projectId) {
        throw notFound('Task not found', 'PROJECT_TASK_NOT_FOUND')
      }
      await assertAssigneeOk(projectId, body.assigneeProjectWorkerId)
      return repository.update(taskId, body)
    },

    async remove(projectId, taskId, actor) {
      await loadOwnerProject(projectId, actor, true)
      const task = await repository.findById(taskId)
      if (!task || task.projectId !== projectId) {
        throw notFound('Task not found', 'PROJECT_TASK_NOT_FOUND')
      }
      await repository.deleteById(taskId)
    },

    async listMine(projectId, query, actor) {
      if (!actor.id) throw unauthorized()
      const membership = await projectWorkersRepository.findWorkerProject(actor.id, projectId)
      if (!membership || membership.status !== 'ACCEPTED') {
        throw forbidden('You are not an accepted worker on this project')
      }
      const page = query.page ?? 1
      const limit = query.limit ?? 20
      const { rows, total } = await repository.findManyForWorker(projectId, actor.id, query)
      return { data: rows, meta: pageMeta(total, page, limit) }
    },

    async updateMineStatus(projectId, taskId, body, actor) {
      if (!actor.id) throw unauthorized()
      const membership = await projectWorkersRepository.findWorkerProject(actor.id, projectId)
      if (!membership || membership.status !== 'ACCEPTED') {
        throw forbidden('You are not an accepted worker on this project')
      }
      if (
        membership.project.archivedAt ||
        membership.project.status === 'COMPLETED' ||
        membership.project.status === 'CANCELLED'
      ) {
        throw forbidden('This project is read-only')
      }
      const task = await repository.findById(taskId)
      if (!task || task.projectId !== projectId) {
        throw notFound('Task not found', 'PROJECT_TASK_NOT_FOUND')
      }
      if (task.assignee?.workerUserId !== actor.id) {
        throw forbidden('You can only update your own tasks')
      }
      return repository.updateStatus(taskId, body.status)
    },
  }
}
