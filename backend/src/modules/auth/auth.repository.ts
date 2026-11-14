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

export type AuthPrincipalRecord = {
  id: string
  role: Role
  status: UserStatus
}

export type AuthRepository = {
  findByEmail: (email: string) => Promise<AuthUserRecord | null>
  findById: (id: string) => Promise<AuthUserRecord | null>
  /** Lean row for request auth — never select password or profile. */
  findPrincipalById: (id: string) => Promise<AuthPrincipalRecord | null>
  createUserWithProfile: (input: CreateAuthUserInput) => Promise<AuthUserRecord>
  updatePasswordHash: (userId: string, passwordHash: string) => Promise<void>
  /** Persist a denied refresh jti until expiresAt (idempotent). */
  denyRefreshJti: (jti: string, expiresAt: Date) => Promise<void>
  isRefreshJtiDenied: (jti: string) => Promise<boolean>
  /** Delete expired denylist rows. Returns number removed. */
  purgeExpiredDeniedRefreshTokens: (now?: Date) => Promise<number>
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

    async findPrincipalById(id) {
      return prisma.user.findUnique({
        where: { id },
        select: { id: true, role: true, status: true },
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

    async updatePasswordHash(userId, passwordHash) {
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
        select: { id: true },
      })
    },

    async denyRefreshJti(jti, expiresAt) {
      await prisma.deniedRefreshToken.upsert({
        where: { jti },
        create: { jti, expiresAt },
        update: { expiresAt },
      })
    },

    async isRefreshJtiDenied(jti) {
      const row = await prisma.deniedRefreshToken.findUnique({
        where: { jti },
        select: { expiresAt: true },
      })
      if (!row) return false
      if (row.expiresAt.getTime() <= Date.now()) {
        await prisma.deniedRefreshToken.delete({ where: { jti } }).catch(() => undefined)
        return false
      }
      return true
    },

    async purgeExpiredDeniedRefreshTokens(now = new Date()) {
      const result = await prisma.deniedRefreshToken.deleteMany({
        where: { expiresAt: { lte: now } },
      })
      return result.count
    },
  }
}
