import { notFound, notImplemented } from '../../errors/app-error.js'
import type { ProjectsRepository } from './projects.repository.js'
import type { CreateProjectBody, UpdateProjectBody } from './projects.schema.js'
import type { Project } from './projects.types.js'

export type ProjectsService = {
  listProjects: () => Promise<Project[]>
  getProjectById: (id: string) => Promise<Project>
  createProject: (input: CreateProjectBody, ownerId: string) => Promise<Project>
  updateProject: (id: string, input: UpdateProjectBody) => Promise<Project>
  archiveProject: (id: string) => Promise<Project>
}

export function createProjectsService(repository: ProjectsRepository): ProjectsService {
  return {
    async listProjects() {
      return repository.findMany()
    },
    async getProjectById(id) {
      const project = await repository.findById(id)
      if (!project) {
        throw notFound('Project not found', 'PROJECT_NOT_FOUND')
      }
      return project
    },
    async createProject() {
      throw notImplemented('projects.createProject')
    },
    async updateProject() {
      throw notImplemented('projects.updateProject')
    },
    async archiveProject() {
      throw notImplemented('projects.archiveProject')
    },
  }
}
