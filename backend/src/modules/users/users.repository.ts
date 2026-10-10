import { prisma } from '../../database/prisma.js'
import type { Prisma, Role, UserStatus, VerificationStatus } from '../../generated/prisma/client.js'
import type { ListApprovalsQuery, ListUsersQuery, ListVerificationsQuery } from './users.schema.js'
import { APPROVAL_ROLES, type User } from './users.types.js'

type UserWithProfile = Prisma.UserGetPayload<{ include: { profile: true } }>

type CreateUserInput = {
  email: string
  passwordHash: string
  role: Role
  status?: UserStatus
  verificationStatus?: VerificationStatus
  isVerified?: boolean
  profile?: {
    firstName?: string
    lastName?: string
    displayName?: string
    phone?: string
  }
}

/** Empty string clears the field. Omitted fields stay unchanged. */
function optionalProfileText(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

type UpdateUserInput = {
  role?: Role
  status?: UserStatus
  verificationStatus?: VerificationStatus
  isVerified?: boolean
  profile?: {
    firstName?: string
    lastName?: string
    displayName?: string
    phone?: string
  }
}

export type ApprovalCounts = {
  pending: number
  approved: number
  providersPending: number
}

export type VerificationCounts = {
  workers: number
  unverified: number
  requested: number
  verified: number
}

export type UserRoleCounts = Record<Role, number>

export type UserDirectoryCounts = {
  active: number
  inactive: number
  managers: number
  createdThisMonth: number
  createdLastMonth: number
  activeCreatedThisMonth: number
  activeCreatedLastMonth: number
  inactiveCreatedThisMonth: number
  inactiveCreatedLastMonth: number
  managersCreatedThisMonth: number
  managersCreatedLastMonth: number
  roles: UserRoleCounts
}

export type UsersRepository = {
  findMany: (query: ListUsersQuery) => Promise<{ users: User[]; total: number }>
  countDirectory: () => Promise<UserDirectoryCounts>
  findApprovals: (query: ListApprovalsQuery) => Promise<{ users: User[]; total: number }>
  countApprovals: () => Promise<ApprovalCounts>
  findVerifications: (query: ListVerificationsQuery) => Promise<{ users: User[]; total: number }>
  countVerifications: () => Promise<VerificationCounts>
  updateVerification: (id: string, verificationStatus: VerificationStatus) => Promise<User>
  findById: (id: string) => Promise<User | null>
  findByEmail: (email: string) => Promise<User | null>
  create: (input: CreateUserInput) => Promise<User>
  update: (id: string, input: UpdateUserInput) => Promise<User>
  updateStatus: (id: string, status: UserStatus) => Promise<User>
  delete: (id: string) => Promise<'deleted' | 'in_use'>
}

const approvalRoles: Role[] = [...APPROVAL_ROLES]

function isPrismaCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code
}

function approvalWhere(query: ListApprovalsQuery): Prisma.UserWhereInput {
  const q = query.q?.trim()
  return {
    role: { in: approvalRoles },
    status: query.approval === 'pending' ? 'PENDING' : 'ACTIVE',
    ...(q
      ? {
          OR: [
            { email: { contains: q, mode: 'insensitive' } },
            {
              profile: {
                is: {
                  OR: [
                    { firstName: { contains: q, mode: 'insensitive' } },
                    { lastName: { contains: q, mode: 'insensitive' } },
                    { displayName: { contains: q, mode: 'insensitive' } },
                    { phone: { contains: q, mode: 'insensitive' } },
                  ],
                },
              },
            },
          ],
        }
      : {}),
  }
}

function workerWhere(q: string | undefined): Prisma.UserWhereInput {
  const query = q?.trim()
  return {
    role: 'WORKER',
    ...(query
      ? {
          OR: [
            { email: { contains: query, mode: 'insensitive' } },
            {
              profile: {
                is: {
                  OR: [
                    { firstName: { contains: query, mode: 'insensitive' } },
                    { lastName: { contains: query, mode: 'insensitive' } },
                    { displayName: { contains: query, mode: 'insensitive' } },
                    { phone: { contains: query, mode: 'insensitive' } },
                  ],
                },
              },
            },
          ],
        }
      : {}),
  }
}

function mapToUser(user: UserWithProfile): User {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    verificationStatus: user.verificationStatus,
    isVerified: user.isVerified,
    profile: user.profile
      ? {
          firstName: user.profile.firstName,
          lastName: user.profile.lastName,
          displayName: user.profile.displayName,
          phone: user.profile.phone,
          avatarUrl: user.profile.avatarUrl,
        }
      : null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }
}

export function createUsersRepository(): UsersRepository {
  return {
    async findMany(query) {
      const page = query.page ?? 1
      const limit = query.limit ?? 20
      const skip = (page - 1) * limit

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          skip,
          take: limit,
          include: { profile: true },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.user.count(),
      ])

      return {
        users: users.map(mapToUser),
        total,
      }
    },

    async countDirectory() {
      const now = new Date()
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const createdIn = (start: Date, end: Date, extra?: Prisma.UserWhereInput) =>
        prisma.user.count({
          where: { ...extra, createdAt: { gte: start, lt: end } },
        })

      const [
        active,
        inactive,
        managers,
        createdThisMonth,
        createdLastMonth,
        activeCreatedThisMonth,
        activeCreatedLastMonth,
        inactiveCreatedThisMonth,
        inactiveCreatedLastMonth,
        managersCreatedThisMonth,
        managersCreatedLastMonth,
        groupedRoles,
      ] = await Promise.all([
        prisma.user.count({ where: { status: 'ACTIVE' } }),
        prisma.user.count({ where: { status: 'INACTIVE' } }),
        prisma.user.count({ where: { role: 'MANAGER' } }),
        createdIn(thisMonth, nextMonth),
        createdIn(lastMonth, thisMonth),
        createdIn(thisMonth, nextMonth, { status: 'ACTIVE' }),
        createdIn(lastMonth, thisMonth, { status: 'ACTIVE' }),
        createdIn(thisMonth, nextMonth, { status: 'INACTIVE' }),
        createdIn(lastMonth, thisMonth, { status: 'INACTIVE' }),
        createdIn(thisMonth, nextMonth, { role: 'MANAGER' }),
        createdIn(lastMonth, thisMonth, { role: 'MANAGER' }),
        prisma.user.groupBy({
          by: ['role'],
          _count: { _all: true },
        }),
      ])

      const roles: UserRoleCounts = {
        SUPER: 0,
        ADMIN: 0,
        MANAGER: 0,
        PROVIDER: 0,
        WORKER: 0,
        CLIENT: 0,
      }
      for (const row of groupedRoles) {
        roles[row.role] = row._count._all
      }

      return {
        active,
        inactive,
        managers,
        createdThisMonth,
        createdLastMonth,
        activeCreatedThisMonth,
        activeCreatedLastMonth,
        inactiveCreatedThisMonth,
        inactiveCreatedLastMonth,
        managersCreatedThisMonth,
        managersCreatedLastMonth,
        roles,
      }
    },

    async findApprovals(query) {
      const page = query.page ?? 1
      const limit = query.limit ?? 20
      const where = approvalWhere(query)
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          include: { profile: true },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.user.count({ where }),
      ])

      return {
        users: users.map(mapToUser),
        total,
      }
    },

    async countApprovals() {
      const [pending, approved, providersPending] = await Promise.all([
        prisma.user.count({ where: { role: { in: approvalRoles }, status: 'PENDING' } }),
        prisma.user.count({ where: { role: { in: approvalRoles }, status: 'ACTIVE' } }),
        prisma.user.count({ where: { role: 'PROVIDER', status: 'PENDING' } }),
      ])
      return { pending, approved, providersPending }
    },

    async findVerifications(query) {
      const page = query.page ?? 1
      const limit = query.limit ?? 20
      const where = workerWhere(query.q)
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          include: { profile: true },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.user.count({ where }),
      ])

      return {
        users: users.map(mapToUser),
        total,
      }
    },

    async countVerifications() {
      const workers = { role: 'WORKER' as const }
      const [total, unverified, requested, verified] = await Promise.all([
        prisma.user.count({ where: workers }),
        prisma.user.count({ where: { ...workers, verificationStatus: 'UNVERIFIED' } }),
        prisma.user.count({ where: { ...workers, verificationStatus: 'REQUESTED' } }),
        prisma.user.count({ where: { ...workers, verificationStatus: 'VERIFIED' } }),
      ])
      return { workers: total, unverified, requested, verified }
    },

    async updateVerification(id, verificationStatus) {
      const user = await prisma.user.update({
        where: { id },
        data: {
          verificationStatus,
          isVerified: verificationStatus === 'VERIFIED',
        },
        include: { profile: true },
      })
      return mapToUser(user)
    },

    async findById(id) {
      const user = await prisma.user.findUnique({
        where: { id },
        include: { profile: true },
      })
      return user ? mapToUser(user) : null
    },

    async findByEmail(email) {
      const user = await prisma.user.findUnique({
        where: { email },
        include: { profile: true },
      })
      return user ? mapToUser(user) : null
    },

    async create(input) {
      const profileData = {
        firstName: input.profile?.firstName?.trim() || undefined,
        lastName: input.profile?.lastName?.trim() || undefined,
        displayName: input.profile?.displayName?.trim() || undefined,
        phone: input.profile?.phone?.trim() || undefined,
      }

      const hasProfileData = Object.values(profileData).some((val) => val !== undefined)

      const user = await prisma.user.create({
        data: {
          email: input.email,
          passwordHash: input.passwordHash,
          role: input.role,
          status: input.status,
          verificationStatus: input.verificationStatus ?? 'UNVERIFIED',
          isVerified: input.isVerified ?? false,
          profile: hasProfileData
            ? {
                create: profileData,
              }
            : undefined,
        },
        include: { profile: true },
      })
      return mapToUser(user)
    },

    async update(id, input) {
      const profileData = {
        firstName: optionalProfileText(input.profile?.firstName),
        lastName: optionalProfileText(input.profile?.lastName),
        displayName: optionalProfileText(input.profile?.displayName),
        phone: optionalProfileText(input.profile?.phone),
      }

      const hasProfileData = Object.values(profileData).some((val) => val !== undefined)

      const user = await prisma.user.update({
        where: { id },
        data: {
          role: input.role,
          status: input.status,
          verificationStatus: input.verificationStatus,
          isVerified: input.isVerified,
          profile: hasProfileData
            ? {
                upsert: {
                  create: profileData,
                  update: profileData,
                },
              }
            : undefined,
        },
        include: { profile: true },
      })
      return mapToUser(user)
    },

    async updateStatus(id, status) {
      const user = await prisma.user.update({
        where: { id },
        data: { status },
        include: { profile: true },
      })
      return mapToUser(user)
    },

    async delete(id) {
      try {
        await prisma.user.delete({ where: { id } })
        return 'deleted'
      } catch (error) {
        if (isPrismaCode(error, 'P2003') || isPrismaCode(error, 'P2014')) {
          return 'in_use'
        }
        throw error
      }
    },
  }
}
