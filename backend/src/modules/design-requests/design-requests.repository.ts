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
  designOffer: { select: { id: true, title: true, imagePath: true } },
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
    designOfferId: row.designOfferId,
    designOfferTitle: row.designOffer?.title ?? null,
    designOfferImagePath: row.designOffer?.imagePath ?? null,
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
  /**
   * Conditional writes: each applies only if the row is still in the state the
   * service validated (compare-and-swap). `null` / `false` = it changed meanwhile.
   */
  updateStatus: (
    id: string,
    from: DesignRequestStatusName,
    to: DesignRequestStatusName,
  ) => Promise<DesignRequestRecord | null>
  /** Sets the requirement file only while PENDING and none is attached yet. */
  updateRequirementPath: (id: string, path: string) => Promise<DesignRequestRecord | null>
  /** Replaces the response file only if status and the previous key are unchanged. */
  updateResponsePath: (
    id: string,
    path: string,
    expected: { statuses: DesignRequestStatusName[]; previousPath: string | null },
  ) => Promise<DesignRequestRecord | null>
  /** Deletes only while the status is one of `statuses`. */
  delete: (id: string, statuses?: DesignRequestStatusName[]) => Promise<boolean>
  findOwnedProject: (
    projectId: string,
    ownerId: string,
  ) => Promise<{ id: string; archivedAt: Date | null } | null>
  findDesignerContact: () => Promise<DesignerContact | null>
  listAdminReceiverIds: () => Promise<string[]>
}

export function createDesignRequestsRepository(): DesignRequestsRepository {
  async function reload(id: string): Promise<DesignRequestRecord | null> {
    const row = await prisma.designRequest.findUnique({ where: { id }, include: requestInclude })
    return row ? toRecord(row) : null
  }

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
          designOfferId: data.designOfferId,
          requestedById: data.requestedById,
          requirementFilePath: data.requirementFilePath ?? null,
        },
        include: requestInclude,
      })
      return toRecord(row)
    },

    async updateStatus(id, from, to) {
      const cas = await prisma.designRequest.updateMany({
        where: { id, status: from as DesignRequestStatus },
        data: { status: to as DesignRequestStatus },
      })
      return cas.count === 1 ? reload(id) : null
    },

    async updateRequirementPath(id, path) {
      const cas = await prisma.designRequest.updateMany({
        where: { id, status: 'PENDING', requirementFilePath: null },
        data: { requirementFilePath: path },
      })
      return cas.count === 1 ? reload(id) : null
    },

    async updateResponsePath(id, path, expected) {
      const cas = await prisma.designRequest.updateMany({
        where: {
          id,
          status: { in: expected.statuses as DesignRequestStatus[] },
          responseFilePath: expected.previousPath,
        },
        data: { responseFilePath: path },
      })
      return cas.count === 1 ? reload(id) : null
    },

    async delete(id, statuses) {
      const result = await prisma.designRequest.deleteMany({
        where: {
          id,
          ...(statuses ? { status: { in: statuses as DesignRequestStatus[] } } : {}),
        },
      })
      return result.count === 1
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
