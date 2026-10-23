import type { AuthActor } from '../../authz/index.js'
import { assertOwnerOrAdmin, isAdmin } from '../../authz/index.js'
import type { AppConfig } from '../../config/index.js'
import { conflict, notFound, validationError } from '../../errors/app-error.js'
import type { StorageService } from '../../storage/storage.service.js'
import type { StepsService } from '../steps/index.js'
import type { ProjectsRepository } from './projects.repository.js'
import { scheduleProgress } from './projects.schedule.js'
import type { CreateProjectBody, ListProjectsQuery, UpdateProjectBody } from './projects.schema.js'
import type { Project, ProjectStatus } from './projects.types.js'

export type ProjectsServiceDeps = {
  config?: AppConfig
  storage?: StorageService
  stepsService?: Pick<StepsService, 'assignActiveToProject'>
}

export type ProjectsService = {
  listProjects: (
    query: ListProjectsQuery,
    actor: AuthActor,
  ) => Promise<{ data: Project[]; meta: { total: number; page: number; limit: number; totalPages: number } }>
  getProjectById: (id: string) => Promise<Project>
  /** Cross-module / HTTP: load project and enforce owner-or-admin. */
  assertAccessible: (id: string, actor: AuthActor) => Promise<Project>
  createProject: (input: CreateProjectBody, ownerId: string) => Promise<Project>
  updateProject: (id: string, input: UpdateProjectBody, actor: AuthActor) => Promise<Project>
  archiveProject: (id: string, actor: AuthActor) => Promise<void>
  getSummary: (actor: AuthActor) => Promise<{ data: ProjectSummary }>
  listTimeline: (actor: AuthActor) => Promise<{ data: ProjectTimelineItem[]; meta: { total: number } }>
}

export type ProjectSummary = {
  total: number
  averageProgress: number
  counts: Record<ProjectStatus, number>
}

export type ProjectTimelineItem = {
  id: string
  name: string
  status: ProjectStatus
  progress: number
  startDate: string | null
  endDate: string | null
  actualStartDate: string | null
  actualEndDate: string | null
  createdAt: string
}

function emptyStatusCounts(): Record<ProjectStatus, number> {
  return {
    DRAFT: 0,
    PLANNING: 0,
    APPROVED: 0,
    IN_PROGRESS: 0,
    ON_HOLD: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  }
}

export function createProjectsService(
  repository: ProjectsRepository,
  deps: ProjectsServiceDeps = {},
): ProjectsService {
  const { config, storage, stepsService } = deps

  async function loadOrThrow(id: string): Promise<Project> {
    const project = await repository.findById(id)
    if (!project) {
      throw notFound('Project not found', 'PROJECT_NOT_FOUND')
    }
    return project
  }

  async function assertAccessible(id: string, actor: AuthActor): Promise<Project> {
    const project = await loadOrThrow(id)
    assertOwnerOrAdmin(actor, project.ownerId)
    return project
  }

  function presentProject(project: Project): Project {
    return {
      ...project,
      progress: scheduleProgress(project.startDate, project.endDate),
    }
  }

  function assertSchedule(startDate: string | null | undefined, endDate: string | null | undefined) {
    if (!startDate || !endDate) return
    if (new Date(endDate).getTime() <= new Date(startDate).getTime()) {
      throw validationError('End date must be after the start date')
    }
  }

  async function resolveMainImageUrl(storagePath: string | null): Promise<string | null> {
    if (!storagePath || !storage || !config) return null
    try {
      return await storage.presignGet({
        key: storagePath,
        expiresInSec: config.storage?.downloadUrlTtlSec ?? config.storageDownloadUrlTtlSec,
      })
    } catch {
      return null
    }
  }

  return {
    async listProjects(query, actor) {
      const ownerScope = isAdmin(actor.roles) ? undefined : actor.id
      const { projects, total } = await repository.findMany(query, ownerScope)
      const page = query.page ?? 1
      const limit = query.limit ?? 20

      const data = await Promise.all(
        projects.map(async ({ mainImageStoragePath, ...project }) => ({
          ...presentProject(project),
          mainImageUrl: await resolveMainImageUrl(mainImageStoragePath),
        })),
      )

      return {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      }
    },

    async getSummary(actor) {
      const ownerScope = isAdmin(actor.roles) ? undefined : actor.id
      const rows = await repository.findScheduleRows(ownerScope)
      const counts = emptyStatusCounts()
      let progressSum = 0
      for (const row of rows) {
        counts[row.status] += 1
        progressSum += scheduleProgress(row.startDate, row.endDate)
      }
      const total = rows.length
      return {
        data: {
          total,
          averageProgress: total === 0 ? 0 : Math.round(progressSum / total),
          counts,
        },
      }
    },

    async listTimeline(actor) {
      const ownerScope = isAdmin(actor.roles) ? undefined : actor.id
      const rows = await repository.findTimeline(ownerScope)
      return {
        data: rows.map((row) => ({
          ...row,
          progress: scheduleProgress(row.startDate, row.endDate),
        })),
        meta: { total: rows.length },
      }
    },

    async getProjectById(id) {
      return presentProject(await loadOrThrow(id))
    },

    assertAccessible,

    async createProject(input, ownerId) {
      if (input.code) {
        const existing = await repository.findByCode(input.code)
        if (existing) {
          throw conflict('Project code already in use', 'CODE_IN_USE')
        }
      }

      assertSchedule(input.startDate, input.endDate)
      const created = await repository.create({
        ...input,
        ownerId,
        progress: scheduleProgress(input.startDate, input.endDate),
      })
      if (stepsService) {
        await stepsService.assignActiveToProject(created.id, ownerId)
      }
      return presentProject(created)
    },

    async updateProject(id, input, actor) {
      const current = await assertAccessible(id, actor)

      if (input.code) {
        const existing = await repository.findByCode(input.code)
        if (existing && existing.id !== id) {
          throw conflict('Project code already in use', 'CODE_IN_USE')
        }
      }

      const startDate = input.startDate !== undefined ? input.startDate : current.startDate
      const endDate = input.endDate !== undefined ? input.endDate : current.endDate
      assertSchedule(startDate, endDate)

      return presentProject(
        await repository.update(id, {
          ...input,
          progress: scheduleProgress(startDate, endDate),
        }),
      )
    },

    async archiveProject(id, actor) {
      await assertAccessible(id, actor)
      await repository.delete(id)
    },
  }
}
