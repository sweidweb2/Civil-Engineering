import { assertOwner, assertOwnerOrAdmin, type AuthActor } from '../../authz/index.js'
import {
  conflict,
  forbidden,
  notFound,
  unauthorized,
  validationError,
} from '../../errors/app-error.js'
import type { Project } from '../projects/projects.types.js'
import type { ProjectsService } from '../projects/index.js'
import type {
  InviteProjectWorkerBody,
  ListProjectWorkersQuery,
  ListWorkerProjectsQuery,
} from './project-workers.schema.js'
import type { ProjectWorkersRepository } from './project-workers.repository.js'
import type {
  ProjectWorker,
  ProjectWorkersNotifyGateway,
  WorkerProjectSummary,
} from './project-workers.types.js'

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

async function softNotify(
  notify: ProjectWorkersNotifyGateway | undefined,
  input: { senderId: string; receiverId: string; title: string; message: string },
) {
  if (!notify) return
  try {
    await notify.notify(input)
  } catch {
    // Invite/accept/reject must succeed even if notification fails.
  }
}

export type ProjectWorkersService = {
  listByProject: (
    projectId: string,
    query: ListProjectWorkersQuery,
    actor: AuthActor,
  ) => Promise<{
    data: ProjectWorker[]
    meta: { total: number; page: number; limit: number; totalPages: number }
  }>
  invite: (
    projectId: string,
    body: InviteProjectWorkerBody,
    actor: AuthActor,
  ) => Promise<ProjectWorker>
  remove: (projectId: string, id: string, actor: AuthActor) => Promise<void>
  listMine: (
    query: ListWorkerProjectsQuery,
    actor: AuthActor,
  ) => Promise<{
    data: WorkerProjectSummary[]
    meta: { total: number; page: number; limit: number; totalPages: number }
  }>
  getMine: (projectId: string, actor: AuthActor) => Promise<WorkerProjectSummary>
  accept: (projectId: string, actor: AuthActor) => Promise<WorkerProjectSummary>
  reject: (projectId: string, actor: AuthActor) => Promise<WorkerProjectSummary>
}

export type ProjectWorkersServiceDeps = {
  repository: ProjectWorkersRepository
  projectsService: ProjectsService
  notify?: ProjectWorkersNotifyGateway
}

export function createProjectWorkersService(
  deps: ProjectWorkersServiceDeps,
): ProjectWorkersService {
  const { repository, projectsService, notify } = deps

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

  async function respondAsWorker(
    projectId: string,
    actor: AuthActor,
    next: 'ACCEPTED' | 'REJECTED',
  ): Promise<WorkerProjectSummary> {
    if (!actor.id) throw unauthorized()

    const mine = await repository.findWorkerProject(actor.id, projectId)
    if (!mine || mine.status !== 'PENDING') {
      const existing = await repository.findByProjectAndWorker(projectId, actor.id)
      if (!existing || existing.status === 'REJECTED') {
        throw notFound('Project invite not found', 'PROJECT_WORKER_NOT_FOUND')
      }
      throw conflict('Invite was already answered', 'PROJECT_WORKER_STALE')
    }

    if (
      mine.project.archivedAt ||
      mine.project.status === 'COMPLETED' ||
      mine.project.status === 'CANCELLED'
    ) {
      throw forbidden('This project is read-only')
    }

    const invitee = await repository.findInvitee(actor.id)
    if (!invitee || invitee.status !== 'ACTIVE') {
      throw forbidden('Your account cannot accept project invites')
    }

    const updated = await repository.respond(mine.projectWorkerId, next, 'PENDING')
    if (!updated) {
      throw conflict('Invite was already answered', 'PROJECT_WORKER_STALE')
    }

    await softNotify(notify, {
      senderId: actor.id,
      receiverId: updated.invitedById,
      title: next === 'ACCEPTED' ? 'Worker accepted invite' : 'Worker rejected invite',
      message:
        next === 'ACCEPTED'
          ? `A worker accepted your invite to “${mine.project.name}”.`
          : `A worker rejected your invite to “${mine.project.name}”.`,
    })

    if (next === 'REJECTED') {
      return {
        ...mine,
        status: 'REJECTED',
        respondedAt: updated.respondedAt,
      }
    }

    const refreshed = await repository.findWorkerProject(actor.id, projectId)
    if (!refreshed) throw notFound('Project invite not found', 'PROJECT_WORKER_NOT_FOUND')
    return refreshed
  }

  return {
    async listByProject(projectId, query, actor) {
      await loadOwnerProject(projectId, actor, false)
      const page = query.page ?? 1
      const limit = query.limit ?? 20
      const { rows, total } = await repository.findManyByProject(projectId, query)
      return {
        data: rows,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      }
    },

    async invite(projectId, body, actor) {
      const project = await loadOwnerProject(projectId, actor, true)
      if (body.workerUserId === actor.id) {
        throw validationError('You cannot invite yourself')
      }

      const invitee = await repository.findInvitee(body.workerUserId)
      if (!invitee) throw notFound('Worker not found', 'WORKER_NOT_FOUND')
      if (invitee.role !== 'WORKER') {
        throw validationError('Only worker accounts can be invited')
      }
      if (invitee.status !== 'ACTIVE') {
        throw validationError('Worker account is not active')
      }
      if (invitee.verificationStatus !== 'VERIFIED' || !invitee.isPublic) {
        throw validationError('Worker must be verified and public in the directory')
      }

      const existing = await repository.findByProjectAndWorker(projectId, body.workerUserId)
      let row: ProjectWorker
      if (!existing) {
        row = await repository.create({
          projectId,
          workerUserId: body.workerUserId,
          invitedById: actor.id,
        })
      } else if (existing.status === 'REJECTED') {
        row = await repository.resetToPending(existing.id, actor.id)
      } else {
        throw conflict('Worker is already invited to this project', 'PROJECT_WORKER_EXISTS')
      }

      await softNotify(notify, {
        senderId: actor.id,
        receiverId: body.workerUserId,
        title: 'Project invite',
        message: `You were invited to join “${project.name}”.`,
      })

      return row
    },

    async remove(projectId, id, actor) {
      await loadOwnerProject(projectId, actor, true)
      const row = await repository.findById(id)
      if (!row || row.projectId !== projectId) {
        throw notFound('Project worker not found', 'PROJECT_WORKER_NOT_FOUND')
      }
      await repository.deleteById(id)
    },

    async listMine(query, actor) {
      if (!actor.id) throw unauthorized()
      const page = query.page ?? 1
      const limit = query.limit ?? 20
      const { rows, total } = await repository.findWorkerProjects(actor.id, query)
      return {
        data: rows,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      }
    },

    async getMine(projectId, actor) {
      if (!actor.id) throw unauthorized()
      const row = await repository.findWorkerProject(actor.id, projectId)
      if (!row) throw notFound('Project invite not found', 'PROJECT_WORKER_NOT_FOUND')
      return row
    },

    async accept(projectId, actor) {
      return respondAsWorker(projectId, actor, 'ACCEPTED')
    },

    async reject(projectId, actor) {
      return respondAsWorker(projectId, actor, 'REJECTED')
    },
  }
}
