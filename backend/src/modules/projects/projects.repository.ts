import type { CreateProjectBody, UpdateProjectBody } from './projects.schema.js'
import type { Project } from './projects.types.js'

export type ProjectsRepository = {
  findMany: () => Promise<Project[]>
  findById: (id: string) => Promise<Project | null>
  create: (input: CreateProjectBody & { ownerId: string }) => Promise<Project>
  update: (id: string, input: UpdateProjectBody) => Promise<Project>
}

export function createProjectsRepository(): ProjectsRepository {
  return {
    async findMany() {
      return []
    },
    async findById() {
      return null
    },
    async create() {
      throw new Error('projects.repository.create requires Prisma')
    },
    async update() {
      throw new Error('projects.repository.update requires Prisma')
    },
  }
}
