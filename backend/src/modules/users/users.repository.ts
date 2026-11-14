import { prisma } from '../../database/prisma.js'
import type { Prisma, Role, UserStatus, VerificationStatus } from '../../generated/prisma/client.js'
import type {
  ListApprovalsQuery,
  ListLookupQuery,
  ListUsersQuery,
  ListVerificationsQuery,
} from './users.schema.js'
import { APPROVAL_ROLES, type User, type UserLookup } from './users.types.js'

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
  accounts: number
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

type DirectoryCountRow = {
  accounts: number | bigint
  active: number | bigint
  inactive: number | bigint
  managers: number | bigint
  createdThisMonth: number | bigint
  createdLastMonth: number | bigint
  activeCreatedThisMonth: number | bigint
  activeCreatedLastMonth: number | bigint
  inactiveCreatedThisMonth: number | bigint
  inactiveCreatedLastMonth: number | bigint
  managersCreatedThisMonth: number | bigint
  managersCreatedLastMonth: number | bigint
  roleSuper: number | bigint
  roleAdmin: number | bigint
  roleManager: number | bigint
  roleProvider: number | bigint
  roleWorker: number | bigint
  roleClient: number | bigint
}

export type UsersRepository = {
  findMany: (query: ListUsersQuery) => Promise<{ users: User[]; total: number }>
  findLookup: (query: ListLookupQuery) => Promise<{ users: UserLookup[]; total: number }>
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
  /** Stores File.id in Profile.avatarUrl (private R2 object; resolve via files download URL). */
  setAvatarFileId: (userId: string, fileId: string | null) => Promise<User>
  delete: (id: string) => Promise<'deleted' | 'in_use'>
}

const approvalRoles: Role[] = [...APPROVAL_ROLES]

function isPrismaCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code
}

function userSearchWhere(q: string | undefined): Prisma.UserWhereInput {
  const query = q?.trim()
  if (!query) return {}
  return {
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
}

function approvalWhere(query: ListApprovalsQuery): Prisma.UserWhereInput {
  return {
    role: { in: approvalRoles },
    status: query.approval === 'pending' ? 'PENDING' : 'ACTIVE',
    ...userSearchWhere(query.q),
  }
}

function workerWhere(q: string | undefined, status?: VerificationStatus): Prisma.UserWhereInput {
  return {
    role: 'WORKER',
    ...(status ? { verificationStatus: status } : {}),
    ...userSearchWhere(q),
  }
}

function profileName(
  profile: { displayName: string | null; firstName: string | null; lastName: string | null } | null,
): string {
  if (!profile) return ''
  const display = profile.displayName?.trim()
  if (display) return display
  return [profile.firstName, profile.lastName]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(' ')
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
      const where = userSearchWhere(query.q)

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

    async findLookup(query) {
      const page = query.page ?? 1
      const limit = query.limit ?? 20
      const where = userSearchWhere(query.q)
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                displayName: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { email: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.user.count({ where }),
      ])
      return {
        users: users.map((user) => ({
          id: user.id,
          email: user.email,
          name: profileName(user.profile),
        })),
        total,
      }
    },

    async countDirectory() {
      const now = new Date()
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

      const [row] = await prisma.$queryRaw<DirectoryCountRow[]>`
        SELECT
          COUNT(*)::int AS accounts,
          COUNT(*) FILTER (WHERE status = 'ACTIVE'::"UserStatus")::int AS active,
          COUNT(*) FILTER (WHERE status = 'INACTIVE'::"UserStatus")::int AS inactive,
          COUNT(*) FILTER (WHERE role = 'MANAGER'::"Role")::int AS managers,
          COUNT(*) FILTER (WHERE "createdAt" >= ${thisMonth} AND "createdAt" < ${nextMonth})::int AS "createdThisMonth",
          COUNT(*) FILTER (WHERE "createdAt" >= ${lastMonth} AND "createdAt" < ${thisMonth})::int AS "createdLastMonth",
          COUNT(*) FILTER (WHERE status = 'ACTIVE'::"UserStatus" AND "createdAt" >= ${thisMonth} AND "createdAt" < ${nextMonth})::int AS "activeCreatedThisMonth",
          COUNT(*) FILTER (WHERE status = 'ACTIVE'::"UserStatus" AND "createdAt" >= ${lastMonth} AND "createdAt" < ${thisMonth})::int AS "activeCreatedLastMonth",
          COUNT(*) FILTER (WHERE status = 'INACTIVE'::"UserStatus" AND "createdAt" >= ${thisMonth} AND "createdAt" < ${nextMonth})::int AS "inactiveCreatedThisMonth",
          COUNT(*) FILTER (WHERE status = 'INACTIVE'::"UserStatus" AND "createdAt" >= ${lastMonth} AND "createdAt" < ${thisMonth})::int AS "inactiveCreatedLastMonth",
          COUNT(*) FILTER (WHERE role = 'MANAGER'::"Role" AND "createdAt" >= ${thisMonth} AND "createdAt" < ${nextMonth})::int AS "managersCreatedThisMonth",
          COUNT(*) FILTER (WHERE role = 'MANAGER'::"Role" AND "createdAt" >= ${lastMonth} AND "createdAt" < ${thisMonth})::int AS "managersCreatedLastMonth",
          COUNT(*) FILTER (WHERE role = 'SUPER'::"Role")::int AS "roleSuper",
          COUNT(*) FILTER (WHERE role = 'ADMIN'::"Role")::int AS "roleAdmin",
          COUNT(*) FILTER (WHERE role = 'MANAGER'::"Role")::int AS "roleManager",
          COUNT(*) FILTER (WHERE role = 'PROVIDER'::"Role")::int AS "roleProvider",
          COUNT(*) FILTER (WHERE role = 'WORKER'::"Role")::int AS "roleWorker",
          COUNT(*) FILTER (WHERE role = 'CLIENT'::"Role")::int AS "roleClient"
        FROM users
      `

      const count = (value: number | bigint | null | undefined) => Number(value ?? 0)
      const current = row ?? {
        accounts: 0,
        active: 0,
        inactive: 0,
        managers: 0,
        createdThisMonth: 0,
        createdLastMonth: 0,
        activeCreatedThisMonth: 0,
        activeCreatedLastMonth: 0,
        inactiveCreatedThisMonth: 0,
        inactiveCreatedLastMonth: 0,
        managersCreatedThisMonth: 0,
        managersCreatedLastMonth: 0,
        roleSuper: 0,
        roleAdmin: 0,
        roleManager: 0,
        roleProvider: 0,
        roleWorker: 0,
        roleClient: 0,
      }

      return {
        accounts: count(current.accounts),
        active: count(current.active),
        inactive: count(current.inactive),
        managers: count(current.managers),
        createdThisMonth: count(current.createdThisMonth),
        createdLastMonth: count(current.createdLastMonth),
        activeCreatedThisMonth: count(current.activeCreatedThisMonth),
        activeCreatedLastMonth: count(current.activeCreatedLastMonth),
        inactiveCreatedThisMonth: count(current.inactiveCreatedThisMonth),
        inactiveCreatedLastMonth: count(current.inactiveCreatedLastMonth),
        managersCreatedThisMonth: count(current.managersCreatedThisMonth),
        managersCreatedLastMonth: count(current.managersCreatedLastMonth),
        roles: {
          SUPER: count(current.roleSuper),
          ADMIN: count(current.roleAdmin),
          MANAGER: count(current.roleManager),
          PROVIDER: count(current.roleProvider),
          WORKER: count(current.roleWorker),
          CLIENT: count(current.roleClient),
        },
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
      const where = workerWhere(query.q, query.status)
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

    async setAvatarFileId(userId, fileId) {
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          profile: {
            upsert: {
              create: { avatarUrl: fileId },
              update: { avatarUrl: fileId },
            },
          },
        },
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
