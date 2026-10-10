import { prisma } from '../../database/prisma.js'
import type { ProjectStatus, ProjectType } from '../../generated/prisma/client.js'
import type { CreateProjectBody, ListProjectsQuery, UpdateProjectBody } from './projects.schema.js'
import type { Project, ProjectListRow } from './projects.types.js'

type CreateProjectInput = CreateProjectBody & {
  ownerId: string
  progress: number
}

type UpdateProjectInput = UpdateProjectBody & {
  progress: number
}

export type ProjectsRepository = {
  findMany: (
    query: ListProjectsQuery,
    ownerId?: string,
  ) => Promise<{ projects: ProjectListRow[]; total: number }>
  findById: (id: string) => Promise<Project | null>
  findByCode: (code: string) => Promise<Project | null>
  create: (input: CreateProjectInput) => Promise<Project>
  update: (id: string, input: UpdateProjectInput) => Promise<Project>
  delete: (id: string) => Promise<void>
}

function mapToProject(project: {
  id: string
  name: string
  description: string | null
  code: string | null
  ownerId: string
  address: string | null
  city: string | null
  country: string | null
  startDate: Date | null
  endDate: Date | null
  actualStartDate: Date | null
  actualEndDate: Date | null
  status: ProjectStatus
  progress: number
  budget: { toString(): string } | null
  currency: string
  actualCost: { toString(): string } | null
  type: ProjectType | null
  isPublic: boolean
  tags: unknown
  attachments: unknown
  notes: string | null
  createdAt: Date
  updatedAt: Date
  archivedAt: Date | null
}): Project {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    code: project.code,
    ownerId: project.ownerId,
    address: project.address,
    city: project.city,
    country: project.country,
    startDate: project.startDate?.toISOString() ?? null,
    endDate: project.endDate?.toISOString() ?? null,
    actualStartDate: project.actualStartDate?.toISOString() ?? null,
    actualEndDate: project.actualEndDate?.toISOString() ?? null,
    status: project.status,
    progress: project.progress,
    budget: project.budget?.toString() ?? null,
    currency: project.currency,
    actualCost: project.actualCost?.toString() ?? null,
    type: project.type,
    isPublic: project.isPublic,
    tags: project.tags,
    attachments: project.attachments,
    notes: project.notes,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    archivedAt: project.archivedAt?.toISOString() ?? null,
  }
}

export function createProjectsRepository(): ProjectsRepository {
  return {
    async findMany(query, ownerId) {
      const page = query.page ?? 1
      const limit = query.limit ?? 20
      const skip = (page - 1) * limit
      const where = {
        archivedAt: null,
        ...(ownerId ? { ownerId } : {}),
        ...(query.status ? { status: query.status as ProjectStatus } : {}),
      }

      const [projects, total] = await Promise.all([
        prisma.project.findMany({
          skip,
          take: limit,
          where,
          orderBy: { createdAt: 'desc' },
          include: {
            images: {
              where: { isMain: true },
              take: 1,
              select: { storagePath: true },
            },
          },
        }),
        prisma.project.count({ where }),
      ])

      return {
        projects: projects.map((project) => ({
          ...mapToProject(project),
          mainImageStoragePath: project.images[0]?.storagePath ?? null,
        })),
        total,
      }
    },

    async findById(id) {
      const project = await prisma.project.findUnique({
        where: { id },
      })
      return project ? mapToProject(project) : null
    },

    async findByCode(code) {
      const project = await prisma.project.findUnique({
        where: { code },
      })
      return project ? mapToProject(project) : null
    },

    async create(input) {
      const project = await prisma.project.create({
        data: {
          name: input.name,
          description: input.description?.trim() || null,
          code: input.code?.trim() || null,
          ownerId: input.ownerId,
          type: input.type as ProjectType | undefined,
          status: 'DRAFT' as ProjectStatus,
          startDate: input.startDate ? new Date(input.startDate) : null,
          endDate: input.endDate ? new Date(input.endDate) : null,
          progress: input.progress,
        },
      })
      return mapToProject(project)
    },

    async update(id, input) {
      const updateData: Record<string, unknown> = {}

      if (input.name !== undefined) updateData.name = input.name
      if (input.description !== undefined) updateData.description = input.description?.trim() || null
      if (input.code !== undefined) updateData.code = input.code?.trim() || null
      if (input.address !== undefined) updateData.address = input.address?.trim() || null
      if (input.city !== undefined) updateData.city = input.city?.trim() || null
      if (input.country !== undefined) updateData.country = input.country?.trim() || null
      if (input.startDate !== undefined)
        updateData.startDate = input.startDate ? new Date(input.startDate) : null
      if (input.endDate !== undefined) updateData.endDate = input.endDate ? new Date(input.endDate) : null
      if (input.actualStartDate !== undefined)
        updateData.actualStartDate = input.actualStartDate ? new Date(input.actualStartDate) : null
      if (input.actualEndDate !== undefined)
        updateData.actualEndDate = input.actualEndDate ? new Date(input.actualEndDate) : null
      if (input.status !== undefined) updateData.status = input.status as ProjectStatus
      if (input.progress !== undefined) updateData.progress = input.progress
      if (input.budget !== undefined) updateData.budget = input.budget
      if (input.currency !== undefined) updateData.currency = input.currency
      if (input.actualCost !== undefined) updateData.actualCost = input.actualCost
      if (input.type !== undefined) updateData.type = input.type as ProjectType
      if (input.isPublic !== undefined) updateData.isPublic = input.isPublic
      if (input.notes !== undefined) updateData.notes = input.notes?.trim() || null

      const project = await prisma.project.update({
        where: { id },
        data: updateData,
      })
      return mapToProject(project)
    },

    async delete(id) {
      await prisma.project.update({
        where: { id },
        data: { archivedAt: new Date() },
      })
    },
  }
}
