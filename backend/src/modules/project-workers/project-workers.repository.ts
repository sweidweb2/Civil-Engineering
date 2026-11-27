import { prisma } from '../../database/prisma.js'
import type { Prisma, ProjectWorkerStatus } from '../../generated/prisma/client.js'
import type { ListProjectWorkersQuery, ListWorkerProjectsQuery } from './project-workers.schema.js'
import type { ProjectWorker, WorkerProjectSummary } from './project-workers.types.js'

type Row = Prisma.ProjectWorkerGetPayload<{
  include: {
    worker: {
      include: {
        profile: true
        workerProfile: true
      }
    }
  }
}>

type WorkerProjectRow = Prisma.ProjectWorkerGetPayload<{
  include: {
    project: {
      include: {
        owner: { include: { profile: true } }
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

function mapWorker(row: Row): ProjectWorker {
  return {
    id: row.id,
    projectId: row.projectId,
    workerUserId: row.workerUserId,
    invitedById: row.invitedById,
    status: row.status,
    invitedAt: row.invitedAt.toISOString(),
    respondedAt: row.respondedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    worker: {
      id: row.worker.id,
      email: row.worker.email,
      displayName: displayName(row.worker.profile),
      firstName: row.worker.profile?.firstName ?? null,
      lastName: row.worker.profile?.lastName ?? null,
      specialty: row.worker.workerProfile?.specialty ?? null,
      city: row.worker.workerProfile?.city ?? null,
      avatarUrl: row.worker.profile?.avatarUrl ?? null,
    },
  }
}

function mapWorkerProject(row: WorkerProjectRow): WorkerProjectSummary {
  const ownerProfile = row.project.owner.profile
  return {
    projectWorkerId: row.id,
    status: row.status,
    invitedAt: row.invitedAt.toISOString(),
    respondedAt: row.respondedAt?.toISOString() ?? null,
    project: {
      id: row.project.id,
      name: row.project.name,
      code: row.project.code,
      city: row.project.city,
      country: row.project.country,
      status: row.project.status,
      startDate: row.project.startDate?.toISOString() ?? null,
      endDate: row.project.endDate?.toISOString() ?? null,
      archivedAt: row.project.archivedAt?.toISOString() ?? null,
      owner: {
        id: row.project.owner.id,
        displayName: displayName(ownerProfile),
        firstName: ownerProfile?.firstName ?? null,
        lastName: ownerProfile?.lastName ?? null,
      },
    },
  }
}

const workerInclude = {
  worker: {
    include: {
      profile: true,
      workerProfile: true,
    },
  },
} as const

const workerProjectInclude = {
  project: {
    include: {
      owner: { include: { profile: true } },
    },
  },
} as const

export type InviteeSnapshot = {
  id: string
  role: string
  status: string
  verificationStatus: string
  isPublic: boolean
}

export type ProjectWorkersRepository = {
  findManyByProject: (
    projectId: string,
    query: ListProjectWorkersQuery,
  ) => Promise<{ rows: ProjectWorker[]; total: number }>
  findById: (id: string) => Promise<ProjectWorker | null>
  findByProjectAndWorker: (projectId: string, workerUserId: string) => Promise<ProjectWorker | null>
  findInvitee: (workerUserId: string) => Promise<InviteeSnapshot | null>
  create: (input: {
    projectId: string
    workerUserId: string
    invitedById: string
  }) => Promise<ProjectWorker>
  resetToPending: (id: string, invitedById: string) => Promise<ProjectWorker>
  deleteById: (id: string) => Promise<void>
  findWorkerProjects: (
    workerUserId: string,
    query: ListWorkerProjectsQuery,
  ) => Promise<{ rows: WorkerProjectSummary[]; total: number }>
  findWorkerProject: (
    workerUserId: string,
    projectId: string,
  ) => Promise<WorkerProjectSummary | null>
  respond: (
    id: string,
    status: Extract<ProjectWorkerStatus, 'ACCEPTED' | 'REJECTED'>,
    expectedStatus: ProjectWorkerStatus,
  ) => Promise<ProjectWorker | null>
}

export function createProjectWorkersRepository(): ProjectWorkersRepository {
  return {
    async findManyByProject(projectId, query) {
      const page = query.page ?? 1
      const limit = query.limit ?? 20
      const where: Prisma.ProjectWorkerWhereInput = {
        projectId,
        ...(query.status ? { status: query.status } : {}),
      }
      const [rows, total] = await Promise.all([
        prisma.projectWorker.findMany({
          where,
          include: workerInclude,
          orderBy: { invitedAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.projectWorker.count({ where }),
      ])
      return { rows: rows.map(mapWorker), total }
    },

    async findById(id) {
      const row = await prisma.projectWorker.findUnique({
        where: { id },
        include: workerInclude,
      })
      return row ? mapWorker(row) : null
    },

    async findByProjectAndWorker(projectId, workerUserId) {
      const row = await prisma.projectWorker.findUnique({
        where: { projectId_workerUserId: { projectId, workerUserId } },
        include: workerInclude,
      })
      return row ? mapWorker(row) : null
    },

    async findInvitee(workerUserId) {
      const user = await prisma.user.findUnique({
        where: { id: workerUserId },
        select: {
          id: true,
          role: true,
          status: true,
          verificationStatus: true,
          workerProfile: { select: { isPublic: true } },
        },
      })
      if (!user) return null
      return {
        id: user.id,
        role: user.role,
        status: user.status,
        verificationStatus: user.verificationStatus,
        isPublic: user.workerProfile?.isPublic ?? false,
      }
    },

    async create(input) {
      const row = await prisma.projectWorker.create({
        data: {
          projectId: input.projectId,
          workerUserId: input.workerUserId,
          invitedById: input.invitedById,
          status: 'PENDING',
        },
        include: workerInclude,
      })
      return mapWorker(row)
    },

    async resetToPending(id, invitedById) {
      const row = await prisma.projectWorker.update({
        where: { id },
        data: {
          status: 'PENDING',
          invitedById,
          invitedAt: new Date(),
          respondedAt: null,
        },
        include: workerInclude,
      })
      return mapWorker(row)
    },

    async deleteById(id) {
      await prisma.projectWorker.delete({ where: { id } })
    },

    async findWorkerProjects(workerUserId, query) {
      const page = query.page ?? 1
      const limit = query.limit ?? 20
      const where: Prisma.ProjectWorkerWhereInput = {
        workerUserId,
        status: { in: ['PENDING', 'ACCEPTED'] },
      }
      const [rows, total] = await Promise.all([
        prisma.projectWorker.findMany({
          where,
          include: workerProjectInclude,
          orderBy: { invitedAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.projectWorker.count({ where }),
      ])
      return { rows: rows.map(mapWorkerProject), total }
    },

    async findWorkerProject(workerUserId, projectId) {
      const row = await prisma.projectWorker.findFirst({
        where: {
          workerUserId,
          projectId,
          status: { in: ['PENDING', 'ACCEPTED'] },
        },
        include: workerProjectInclude,
      })
      return row ? mapWorkerProject(row) : null
    },

    async respond(id, status, expectedStatus) {
      const result = await prisma.projectWorker.updateMany({
        where: { id, status: expectedStatus },
        data: { status, respondedAt: new Date() },
      })
      if (result.count === 0) return null
      const row = await prisma.projectWorker.findUnique({
        where: { id },
        include: workerInclude,
      })
      return row ? mapWorker(row) : null
    },
  }
}
