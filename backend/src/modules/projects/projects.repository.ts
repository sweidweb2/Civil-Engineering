import { prisma } from '../../database/prisma.js'
import type { DbClient } from '../../database/transaction.js'
import { conflict } from '../../errors/app-error.js'
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

export type ProjectTimelineRow = {
  id: string
  name: string
  status: ProjectStatus
  startDate: string | null
  endDate: string | null
  actualStartDate: string | null
  actualEndDate: string | null
  createdAt: string
}

export type ProjectSummaryAggregate = {
  total: number
  averageProgress: number
  counts: Record<ProjectStatus, number>
}

export type ProjectsRepository = {
  findMany: (
    query: ListProjectsQuery,
    ownerId?: string,
  ) => Promise<{ projects: ProjectListRow[]; total: number }>
  /** SQL aggregates for dashboard summary — no row dump. */
  summarize: (ownerId?: string) => Promise<ProjectSummaryAggregate>
  findTimeline: (ownerId?: string) => Promise<ProjectTimelineRow[]>
  findById: (id: string) => Promise<Project | null>
  findByCode: (code: string) => Promise<Project | null>
  /** Storage path of the project's `isMain` gallery image, if any. */
  findMainImageStoragePath: (projectId: string) => Promise<string | null>
  create: (input: CreateProjectInput, db?: DbClient) => Promise<Project>
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
      const search = query.q?.trim()
      const where = {
        archivedAt: null,
        ...(ownerId ? { ownerId } : {}),
        ...(query.status ? { status: query.status as ProjectStatus } : {}),
        ...(query.type ? { type: query.type } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' as const } },
                { code: { contains: search, mode: 'insensitive' as const } },
                { city: { contains: search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      }

      const [projects, total] = await Promise.all([
        prisma.project.findMany({
          skip,
          take: limit,
          where,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            description: true,
            code: true,
            ownerId: true,
            city: true,
            country: true,
            startDate: true,
            endDate: true,
            status: true,
            progress: true,
            type: true,
            createdAt: true,
            updatedAt: true,
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
          id: project.id,
          name: project.name,
          description: project.description,
          code: project.code,
          ownerId: project.ownerId,
          city: project.city,
          country: project.country,
          startDate: project.startDate?.toISOString() ?? null,
          endDate: project.endDate?.toISOString() ?? null,
          status: project.status,
          progress: project.progress,
          type: project.type,
          createdAt: project.createdAt.toISOString(),
          updatedAt: project.updatedAt.toISOString(),
          mainImageStoragePath: project.images[0]?.storagePath ?? null,
        })),
        total,
      }
    },

    async summarize(ownerId) {
      const where = { archivedAt: null, ...(ownerId ? { ownerId } : {}) }
      const [groups, aggregate] = await Promise.all([
        prisma.project.groupBy({
          by: ['status'],
          where,
          _count: { _all: true },
        }),
        prisma.project.aggregate({
          where,
          _count: { _all: true },
          _avg: { progress: true },
        }),
      ])

      const counts: Record<ProjectStatus, number> = {
        DRAFT: 0,
        PLANNING: 0,
        APPROVED: 0,
        IN_PROGRESS: 0,
        ON_HOLD: 0,
        COMPLETED: 0,
        CANCELLED: 0,
      }
      for (const group of groups) {
        counts[group.status] = group._count._all
      }

      return {
        total: aggregate._count._all,
        averageProgress: Math.round(aggregate._avg.progress ?? 0),
        counts,
      }
    },

    async findTimeline(ownerId) {
      const MAX_TIMELINE_ROWS = 50
      const rows = await prisma.project.findMany({
        where: {
          archivedAt: null,
          status: 'IN_PROGRESS',
          ...(ownerId ? { ownerId } : {}),
        },
        select: {
          id: true,
          name: true,
          status: true,
          startDate: true,
          endDate: true,
          actualStartDate: true,
          actualEndDate: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: MAX_TIMELINE_ROWS,
      })
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        status: row.status,
        startDate: row.startDate?.toISOString() ?? null,
        endDate: row.endDate?.toISOString() ?? null,
        actualStartDate: row.actualStartDate?.toISOString() ?? null,
        actualEndDate: row.actualEndDate?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
      }))
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

    async findMainImageStoragePath(projectId) {
      const image = await prisma.projectImage.findFirst({
        where: { projectId, isMain: true },
        select: { storagePath: true },
      })
      return image?.storagePath ?? null
    },

    async create(input, db: DbClient = prisma) {
      const project = await db.project.create({
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
      const { expectedUpdatedAt, ...fields } = input
      const expected = new Date(expectedUpdatedAt)
      if (Number.isNaN(expected.getTime())) {
        throw conflict('expectedUpdatedAt must be a valid timestamp', 'PROJECT_VERSION_INVALID')
      }

      const updateData: Record<string, unknown> = {}

      if (fields.name !== undefined) updateData.name = fields.name
      if (fields.description !== undefined)
        updateData.description = fields.description?.trim() || null
      if (fields.code !== undefined) updateData.code = fields.code?.trim() || null
      if (fields.address !== undefined) updateData.address = fields.address?.trim() || null
      if (fields.city !== undefined) updateData.city = fields.city?.trim() || null
      if (fields.country !== undefined) updateData.country = fields.country?.trim() || null
      if (fields.startDate !== undefined)
        updateData.startDate = fields.startDate ? new Date(fields.startDate) : null
      if (fields.endDate !== undefined)
        updateData.endDate = fields.endDate ? new Date(fields.endDate) : null
      if (fields.actualStartDate !== undefined)
        updateData.actualStartDate = fields.actualStartDate
          ? new Date(fields.actualStartDate)
          : null
      if (fields.actualEndDate !== undefined)
        updateData.actualEndDate = fields.actualEndDate ? new Date(fields.actualEndDate) : null
      if (fields.status !== undefined) updateData.status = fields.status as ProjectStatus
      if (fields.progress !== undefined) updateData.progress = fields.progress
      if (fields.budget !== undefined) updateData.budget = fields.budget
      if (fields.currency !== undefined) updateData.currency = fields.currency
      if (fields.actualCost !== undefined) updateData.actualCost = fields.actualCost
      if (fields.type !== undefined) updateData.type = fields.type as ProjectType
      if (fields.isPublic !== undefined) updateData.isPublic = fields.isPublic
      if (fields.notes !== undefined) updateData.notes = fields.notes?.trim() || null

      const cas = await prisma.project.updateMany({
        where: { id, updatedAt: expected, archivedAt: null },
        data: updateData,
      })
      if (cas.count !== 1) {
        const stillThere = await prisma.project.findFirst({
          where: { id, archivedAt: null },
          select: { id: true },
        })
        if (!stillThere) {
          throw conflict(
            'Project was modified elsewhere; reload and try again',
            'PROJECT_VERSION_CONFLICT',
          )
        }
        throw conflict(
          'Project was modified elsewhere; reload and try again',
          'PROJECT_VERSION_CONFLICT',
        )
      }

      const project = await prisma.project.findUniqueOrThrow({ where: { id } })
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
