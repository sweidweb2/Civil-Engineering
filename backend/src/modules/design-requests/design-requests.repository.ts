import { prisma } from '../../database/prisma.js'
import type { DesignRequestStatus, Prisma } from '../../generated/prisma/client.js'
import type {
  CreateDesignRequestData,
  DesignerContact,
  DesignRequestRecord,
  DesignRequestStatusName,
  ListDesignRequestsFilter,
} from './design-requests.types.js'

const requestInclude = {
  project: { select: { id: true, name: true } },
  requestedBy: {
    select: {
      id: true,
      email: true,
      profile: { select: { displayName: true, firstName: true, lastName: true } },
    },
  },
} as const

type RequestRow = Prisma.DesignRequestGetPayload<{ include: typeof requestInclude }>

type ProfileName = {
  displayName: string | null
  firstName: string | null
  lastName: string | null
} | null

function personName(profile: ProfileName, email: string): string {
  if (!profile) return email
  return (
    profile.displayName || [profile.firstName, profile.lastName].filter(Boolean).join(' ') || email
  )
}

function toRecord(row: RequestRow): DesignRequestRecord {
  return {
    id: row.id,
    subject: row.subject,
    description: row.description,
    category: row.category,
    status: row.status,
    neededBy: row.neededBy,
    requirementFilePath: row.requirementFilePath,
    responseFilePath: row.responseFilePath,
    projectId: row.projectId,
    projectName: row.project?.name ?? null,
    requestedById: row.requestedById,
    requestedByEmail: row.requestedBy.email,
    requestedByName: personName(row.requestedBy.profile, row.requestedBy.email),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export type DesignRequestsRepository = {
  findMany: (
    filter: ListDesignRequestsFilter,
  ) => Promise<{ items: DesignRequestRecord[]; total: number }>
  findById: (id: string) => Promise<DesignRequestRecord | null>
  create: (data: CreateDesignRequestData) => Promise<DesignRequestRecord>
  updateStatus: (id: string, status: DesignRequestStatusName) => Promise<DesignRequestRecord>
  updateRequirementPath: (id: string, path: string) => Promise<DesignRequestRecord>
  updateResponsePath: (id: string, path: string) => Promise<DesignRequestRecord>
  delete: (id: string) => Promise<void>
  findOwnedProject: (
    projectId: string,
    ownerId: string,
  ) => Promise<{ id: string; archivedAt: Date | null } | null>
  findDesignerContact: () => Promise<DesignerContact | null>
  listAdminReceiverIds: () => Promise<string[]>
}

export function createDesignRequestsRepository(): DesignRequestsRepository {
  return {
    async findMany(filter) {
      const where: Prisma.DesignRequestWhereInput = {
        ...(filter.status ? { status: filter.status as DesignRequestStatus } : {}),
        ...(filter.projectId ? { projectId: filter.projectId } : {}),
        ...(filter.requestedById ? { requestedById: filter.requestedById } : {}),
      }
      const skip = (filter.page - 1) * filter.limit
      const [rows, total] = await Promise.all([
        prisma.designRequest.findMany({
          where,
          include: requestInclude,
          orderBy: { createdAt: 'desc' },
          skip,
          take: filter.limit,
        }),
        prisma.designRequest.count({ where }),
      ])
      return { items: rows.map(toRecord), total }
    },

    async findById(id) {
      const row = await prisma.designRequest.findUnique({
        where: { id },
        include: requestInclude,
      })
      return row ? toRecord(row) : null
    },

    async create(data) {
      const row = await prisma.designRequest.create({
        data: {
          subject: data.subject,
          description: data.description,
          category: data.category,
          neededBy: data.neededBy,
          projectId: data.projectId,
          requestedById: data.requestedById,
          requirementFilePath: data.requirementFilePath ?? null,
        },
        include: requestInclude,
      })
      return toRecord(row)
    },

    async updateStatus(id, status) {
      const row = await prisma.designRequest.update({
        where: { id },
        data: { status: status as DesignRequestStatus },
        include: requestInclude,
      })
      return toRecord(row)
    },

    async updateRequirementPath(id, path) {
      const row = await prisma.designRequest.update({
        where: { id },
        data: { requirementFilePath: path },
        include: requestInclude,
      })
      return toRecord(row)
    },

    async updateResponsePath(id, path) {
      const row = await prisma.designRequest.update({
        where: { id },
        data: { responseFilePath: path },
        include: requestInclude,
      })
      return toRecord(row)
    },

    async delete(id) {
      await prisma.designRequest.delete({ where: { id } })
    },

    async findOwnedProject(projectId, ownerId) {
      return prisma.project.findFirst({
        where: { id: projectId, ownerId },
        select: { id: true, archivedAt: true },
      })
    },

    async findDesignerContact() {
      const admin = await prisma.user.findFirst({
        where: { role: 'ADMIN', status: 'ACTIVE' },
        orderBy: { createdAt: 'asc' },
        select: {
          email: true,
          profile: { select: { phone: true, displayName: true, firstName: true, lastName: true } },
        },
      })
      const user =
        admin ??
        (await prisma.user.findFirst({
          where: { role: 'SUPER', status: 'ACTIVE' },
          orderBy: { createdAt: 'asc' },
          select: {
            email: true,
            profile: {
              select: { phone: true, displayName: true, firstName: true, lastName: true },
            },
          },
        }))
      if (!user) return null
      return {
        email: user.email,
        phone: user.profile?.phone ?? null,
        displayName: personName(user.profile, user.email),
      }
    },

    async listAdminReceiverIds() {
      const users = await prisma.user.findMany({
        where: {
          status: 'ACTIVE',
          role: { in: ['ADMIN', 'SUPER'] },
        },
        select: { id: true },
      })
      return users.map((u) => u.id)
    },
  }
}
