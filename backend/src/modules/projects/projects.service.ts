import type { AuthActor } from '../../authz/index.js'
import { assertOwnerOrAdmin } from '../../authz/index.js'
import { notFound, notImplemented } from '../../errors/app-error.js'
import type { ProjectsRepository } from './projects.repository.js'
import type { CreateProjectBody, UpdateProjectBody } from './projects.schema.js'
import type { Project } from './projects.types.js'

export type ProjectsService = {
  listProjects: () => Promise<Project[]>
  getProjectById: (id: string) => Promise<Project>
  /** Cross-module / HTTP: load project and enforce owner-or-admin. */
  assertAccessible: (id: string, actor: AuthActor) => Promise<Project>
  createProject: (input: CreateProjectBody, ownerId: string) => Promise<Project>
  updateProject: (id: string, input: UpdateProjectBody, actor: AuthActor) => Promise<Project>
  archiveProject: (id: string, actor: AuthActor) => Promise<Project>
}

export function createProjectsService(repository: ProjectsRepository): ProjectsService {
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

  return {
    async listProjects() {
      return repository.findMany()
    },
    async getProjectById(id) {
      return loadOrThrow(id)
    },
    assertAccessible,
    async createProject() {
      throw notImplemented('projects.createProject')
    },
    async updateProject(id, _input, actor) {
      await assertAccessible(id, actor)
      throw notImplemented('projects.updateProject')
    },
    async archiveProject(id, actor) {
      await assertAccessible(id, actor)
      throw notImplemented('projects.archiveProject')
    },
  }
}
