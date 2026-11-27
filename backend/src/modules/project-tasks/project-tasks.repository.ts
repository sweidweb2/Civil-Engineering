import { prisma } from '../../database/prisma.js'
import type { Prisma } from '../../generated/prisma/client.js'
import type {
  CreateProjectTaskBody,
  ListProjectTasksQuery,
  UpdateProjectTaskBody,
} from './project-tasks.schema.js'
import type { ProjectTask } from './project-tasks.types.js'

type Row = Prisma.ProjectTaskGetPayload<{
  include: {
    assignee: {
      include: {
        worker: { include: { profile: true } }
      }
    }
  }
}>

function displayName(
  profile: {
    displayName: string | null
    firstName: string | null
    lastName: string | null
  } | null,
): string | null {
  if (!profile) return null
  if (profile.displayName?.trim()) return profile.displayName.trim()
  const parts = [profile.firstName, profile.lastName]
    .map((p) => p?.trim())
    .filter((p): p is string => Boolean(p))
  return parts.length ? parts.join(' ') : null
}

function mapTask(row: Row): ProjectTask {
  const assignee = row.assignee
  return {
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    description: row.description,
    status: row.status,
    dueDate: row.dueDate ? row.dueDate.toISOString().slice(0, 10) : null,
    assigneeProjectWorkerId: row.assigneeProjectWorkerId,
    createdById: row.createdById,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    assignee: assignee
      ? {
          id: assignee.id,
          workerUserId: assignee.workerUserId,
          status: assignee.status,
          displayName: displayName(assignee.worker.profile),
          firstName: assignee.worker.profile?.firstName ?? null,
          lastName: assignee.worker.profile?.lastName ?? null,
          email: assignee.worker.email,
        }
      : null,
  }
}

const include = {
  assignee: {
    include: {
      worker: { include: { profile: true } },
    },
  },
} as const

export type ProjectWorkersLookup = {
  id: string
  projectId: string
  status: string
  workerUserId: string
}

export type ProjectTasksRepository = {
  findManyByProject: (
    projectId: string,
    query: ListProjectTasksQuery,
  ) => Promise<{ rows: ProjectTask[]; total: number }>
  findManyForWorker: (
    projectId: string,
    workerUserId: string,
    query: ListProjectTasksQuery,
  ) => Promise<{ rows: ProjectTask[]; total: number }>
  findById: (id: string) => Promise<ProjectTask | null>
  findProjectWorker: (id: string) => Promise<ProjectWorkersLookup | null>
  create: (
    projectId: string,
    createdById: string,
    body: CreateProjectTaskBody,
  ) => Promise<ProjectTask>
  update: (id: string, body: UpdateProjectTaskBody) => Promise<ProjectTask>
  updateStatus: (id: string, status: ProjectTask['status']) => Promise<ProjectTask>
  deleteById: (id: string) => Promise<void>
}

export function createProjectTasksRepository(): ProjectTasksRepository {
  return {
    async findManyByProject(projectId, query) {
      const page = query.page ?? 1
      const limit = query.limit ?? 20
      const where: Prisma.ProjectTaskWhereInput = {
        projectId,
        ...(query.status ? { status: query.status } : {}),
      }
      const [rows, total] = await Promise.all([
        prisma.projectTask.findMany({
          where,
          include,
          orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.projectTask.count({ where }),
      ])
      return { rows: rows.map(mapTask), total }
    },

    async findManyForWorker(projectId, workerUserId, query) {
      const page = query.page ?? 1
      const limit = query.limit ?? 20
      const where: Prisma.ProjectTaskWhereInput = {
        projectId,
        ...(query.status ? { status: query.status } : {}),
        assignee: { workerUserId, status: 'ACCEPTED' },
      }
      const [rows, total] = await Promise.all([
        prisma.projectTask.findMany({
          where,
          include,
          orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.projectTask.count({ where }),
      ])
      return { rows: rows.map(mapTask), total }
    },

    async findById(id) {
      const row = await prisma.projectTask.findUnique({ where: { id }, include })
      return row ? mapTask(row) : null
    },

    async findProjectWorker(id) {
      const row = await prisma.projectWorker.findUnique({
        where: { id },
        select: { id: true, projectId: true, status: true, workerUserId: true },
      })
      return row
    },

    async create(projectId, createdById, body) {
      const row = await prisma.projectTask.create({
        data: {
          projectId,
          createdById,
          title: body.title,
          description: body.description ?? null,
          status: body.status ?? 'TODO',
          dueDate: body.dueDate ? new Date(`${body.dueDate}T00:00:00.000Z`) : null,
          assigneeProjectWorkerId: body.assigneeProjectWorkerId ?? null,
        },
        include,
      })
      return mapTask(row)
    },

    async update(id, body) {
      const data: Prisma.ProjectTaskUpdateInput = {}
      if (body.title !== undefined) data.title = body.title
      if (body.description !== undefined) data.description = body.description
      if (body.status !== undefined) data.status = body.status
      if (body.dueDate !== undefined) {
        data.dueDate = body.dueDate ? new Date(`${body.dueDate}T00:00:00.000Z`) : null
      }
      if (body.assigneeProjectWorkerId !== undefined) {
        data.assignee =
          body.assigneeProjectWorkerId === null
            ? { disconnect: true }
            : { connect: { id: body.assigneeProjectWorkerId } }
      }
      const row = await prisma.projectTask.update({ where: { id }, data, include })
      return mapTask(row)
    },

    async updateStatus(id, status) {
      const row = await prisma.projectTask.update({
        where: { id },
        data: { status },
        include,
      })
      return mapTask(row)
    },

    async deleteById(id) {
      await prisma.projectTask.delete({ where: { id } })
    },
  }
}
