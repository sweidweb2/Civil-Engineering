import type { AuthActor } from '../../authz/index.js'
import { assertOwnerOrAdmin, isAdmin } from '../../authz/index.js'
import type { AppConfig } from '../../config/index.js'
import { conflict, notFound } from '../../errors/app-error.js'
import type { StorageService } from '../../storage/storage.service.js'
import type { ProjectsRepository } from './projects.repository.js'
import type { CreateProjectBody, ListProjectsQuery, UpdateProjectBody } from './projects.schema.js'
import type { Project } from './projects.types.js'

export type ProjectsServiceDeps = {
  config?: AppConfig
  storage?: StorageService
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
}

export function createProjectsService(
  repository: ProjectsRepository,
  deps: ProjectsServiceDeps = {},
): ProjectsService {
  const { config, storage } = deps

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
          ...project,
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

    async getProjectById(id) {
      return loadOrThrow(id)
    },

    assertAccessible,

    async createProject(input, ownerId) {
      if (input.code) {
        const existing = await repository.findByCode(input.code)
        if (existing) {
          throw conflict('Project code already in use', 'CODE_IN_USE')
        }
      }

      return repository.create({
        ...input,
        ownerId,
      })
    },

    async updateProject(id, input, actor) {
      await assertAccessible(id, actor)

      if (input.code) {
        const existing = await repository.findByCode(input.code)
        if (existing && existing.id !== id) {
          throw conflict('Project code already in use', 'CODE_IN_USE')
        }
      }

      return repository.update(id, input)
    },

    async archiveProject(id, actor) {
      await assertAccessible(id, actor)
      await repository.delete(id)
    },
  }
}
