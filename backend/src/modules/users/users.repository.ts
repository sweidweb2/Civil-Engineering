import { prisma } from '../../database/prisma.js'
import type { Role, UserStatus } from '../../generated/prisma/client.js'
import type { ListUsersQuery } from './users.schema.js'
import type { User } from './users.types.js'

type CreateUserInput = {
  email: string
  passwordHash: string
  role: Role
  profile?: {
    firstName?: string
    lastName?: string
    displayName?: string
    phone?: string
  }
}

type UpdateUserInput = {
  role?: Role
  status?: UserStatus
  profile?: {
    firstName?: string
    lastName?: string
    displayName?: string
    phone?: string
  }
}

export type UsersRepository = {
  findMany: (query: ListUsersQuery) => Promise<{ users: User[]; total: number }>
  findById: (id: string) => Promise<User | null>
  findByEmail: (email: string) => Promise<User | null>
  create: (input: CreateUserInput) => Promise<User>
  update: (id: string, input: UpdateUserInput) => Promise<User>
  updateStatus: (id: string, status: UserStatus) => Promise<User>
}

function mapToUser(user: any): User {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
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
        firstName: input.profile?.firstName?.trim() || undefined,
        lastName: input.profile?.lastName?.trim() || undefined,
        displayName: input.profile?.displayName?.trim() || undefined,
        phone: input.profile?.phone?.trim() || undefined,
      }

      const hasProfileData = Object.values(profileData).some((val) => val !== undefined)

      const user = await prisma.user.update({
        where: { id },
        data: {
          role: input.role,
          status: input.status,
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
  }
}
