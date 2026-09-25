import { prisma } from '../../database/prisma.js'
import type { Role, UserStatus } from '../../generated/prisma/client.js'

export type AuthUserRecord = {
  id: string
  email: string
  passwordHash: string
  role: Role
  status: UserStatus
  isVerified: boolean
  profile: {
    firstName: string | null
    lastName: string | null
    displayName: string | null
  } | null
}

export type CreateAuthUserInput = {
  email: string
  passwordHash: string
  role: Role
  firstName?: string
  lastName?: string
}

export type AuthRepository = {
  findByEmail: (email: string) => Promise<AuthUserRecord | null>
  findById: (id: string) => Promise<AuthUserRecord | null>
  createUserWithProfile: (input: CreateAuthUserInput) => Promise<AuthUserRecord>
}

export function createAuthRepository(): AuthRepository {
  return {
    async findByEmail(email) {
      return prisma.user.findUnique({
        where: { email },
        include: {
          profile: {
            select: { firstName: true, lastName: true, displayName: true },
          },
        },
      })
    },

    async findById(id) {
      return prisma.user.findUnique({
        where: { id },
        include: {
          profile: {
            select: { firstName: true, lastName: true, displayName: true },
          },
        },
      })
    },

    async createUserWithProfile(input) {
      const displayName = [input.firstName, input.lastName].filter(Boolean).join(' ') || null

      return prisma.user.create({
        data: {
          email: input.email,
          passwordHash: input.passwordHash,
          role: input.role,
          profile: {
            create: {
              firstName: input.firstName ?? null,
              lastName: input.lastName ?? null,
              displayName,
            },
          },
        },
        include: {
          profile: {
            select: { firstName: true, lastName: true, displayName: true },
          },
        },
      })
    },
  }
}
