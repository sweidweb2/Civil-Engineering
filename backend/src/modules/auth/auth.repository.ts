import { prisma } from '../../database/prisma.js'
import { runInTransaction } from '../../database/transaction.js'
import { Prisma, type Role, type UserStatus } from '../../generated/prisma/client.js'

export type AuthUserRecord = {
  id: string
  email: string
  passwordHash: string
  role: Role
  status: UserStatus
  isVerified: boolean
  refreshInvalidBefore: Date | null
  profile: {
    firstName: string | null
    lastName: string | null
    displayName: string | null
  } | null
}

export type RegisterWithDeviceCapResult =
  { outcome: 'created'; user: AuthUserRecord } | { outcome: 'device_limit' }

export type CreateAuthUserInput = {
  email: string
  passwordHash: string
  role: Role
  status: UserStatus
  firstName?: string
  lastName?: string
}

export type RecordRegistrationAttemptInput = {
  deviceId: string
  ipAddress: string | null
  userAgent: string | null
  userId: string
  role: Role
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
  /**
   * Atomically enforce the per-device registration cap (advisory lock + count +
   * user create + attempt row in one transaction).
   */
  createUserWithDeviceCap: (
    input: CreateAuthUserInput & {
      deviceId: string
      ipAddress: string | null
      userAgent: string | null
      maxRegistrations: number
    },
  ) => Promise<RegisterWithDeviceCapResult>
  countRegistrationsByDevice: (deviceId: string) => Promise<number>
  recordRegistrationAttempt: (input: RecordRegistrationAttemptInput) => Promise<void>
  updatePasswordHash: (userId: string, passwordHash: string) => Promise<void>
  /**
   * Update password and stamp refreshInvalidBefore so existing refresh JWTs fail.
   */
  updatePasswordHashAndInvalidateRefresh: (
    userId: string,
    passwordHash: string,
    invalidBefore?: Date,
  ) => Promise<void>
  /** Stamp refreshInvalidBefore so every outstanding refresh JWT for the user fails. */
  invalidateRefreshTokens: (userId: string, invalidBefore?: Date) => Promise<void>
  /** Persist a denied refresh jti until expiresAt (idempotent). */
  denyRefreshJti: (jti: string, expiresAt: Date) => Promise<void>
  /**
   * Atomically claim a refresh jti for rotation.
   * `claimed` — first winner; `reuse` — jti already denied (concurrent/replay).
   */
  claimRefreshJti: (jti: string, expiresAt: Date) => Promise<'claimed' | 'reuse'>
  isRefreshJtiDenied: (jti: string) => Promise<boolean>
  /** Delete expired denylist rows. Returns number removed. */
  purgeExpiredDeniedRefreshTokens: (now?: Date) => Promise<number>
}

const authUserInclude = {
  profile: {
    select: { firstName: true, lastName: true, displayName: true },
  },
} as const

function mapAuthUser(row: {
  id: string
  email: string
  passwordHash: string
  role: Role
  status: UserStatus
  isVerified: boolean
  refreshInvalidBefore: Date | null
  profile: {
    firstName: string | null
    lastName: string | null
    displayName: string | null
  } | null
}): AuthUserRecord {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.passwordHash,
    role: row.role,
    status: row.status,
    isVerified: row.isVerified,
    refreshInvalidBefore: row.refreshInvalidBefore,
    profile: row.profile,
  }
}

export function createAuthRepository(): AuthRepository {
  return {
    async findByEmail(email) {
      const row = await prisma.user.findUnique({
        where: { email },
        include: authUserInclude,
      })
      return row ? mapAuthUser(row) : null
    },

    async findById(id) {
      const row = await prisma.user.findUnique({
        where: { id },
        include: authUserInclude,
      })
      return row ? mapAuthUser(row) : null
    },

    async findPrincipalById(id) {
      return prisma.user.findUnique({
        where: { id },
        select: { id: true, role: true, status: true },
      })
    },

    async createUserWithProfile(input) {
      const displayName = [input.firstName, input.lastName].filter(Boolean).join(' ') || null

      const row = await prisma.user.create({
        data: {
          email: input.email,
          passwordHash: input.passwordHash,
          role: input.role,
          status: input.status,
          profile: {
            create: {
              firstName: input.firstName ?? null,
              lastName: input.lastName ?? null,
              displayName,
            },
          },
        },
        include: authUserInclude,
      })
      return mapAuthUser(row)
    },

    async createUserWithDeviceCap(input) {
      return runInTransaction(async (tx) => {
        // Serialize registrations for this device fingerprint across concurrent requests.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.deviceId}))`

        const deviceCount = await tx.registrationAttempt.count({
          where: { deviceId: input.deviceId },
        })
        if (deviceCount >= input.maxRegistrations) {
          return { outcome: 'device_limit' as const }
        }

        const displayName = [input.firstName, input.lastName].filter(Boolean).join(' ') || null
        const row = await tx.user.create({
          data: {
            email: input.email,
            passwordHash: input.passwordHash,
            role: input.role,
            status: input.status,
            profile: {
              create: {
                firstName: input.firstName ?? null,
                lastName: input.lastName ?? null,
                displayName,
              },
            },
          },
          include: authUserInclude,
        })

        await tx.registrationAttempt.create({
          data: {
            deviceId: input.deviceId,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
            userId: row.id,
            role: input.role,
          },
        })

        return { outcome: 'created' as const, user: mapAuthUser(row) }
      })
    },

    async countRegistrationsByDevice(deviceId) {
      return prisma.registrationAttempt.count({ where: { deviceId } })
    },

    async recordRegistrationAttempt(input) {
      await prisma.registrationAttempt.create({
        data: {
          deviceId: input.deviceId,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          userId: input.userId,
          role: input.role,
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

    async updatePasswordHashAndInvalidateRefresh(userId, passwordHash, invalidBefore = new Date()) {
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash, refreshInvalidBefore: invalidBefore },
        select: { id: true },
      })
    },

    async invalidateRefreshTokens(userId, invalidBefore = new Date()) {
      await prisma.user.update({
        where: { id: userId },
        data: { refreshInvalidBefore: invalidBefore },
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

    async claimRefreshJti(jti, expiresAt) {
      // Single-statement claim — concurrent refreshes cannot both insert the same jti.
      const inserted = await prisma.$executeRaw`
        INSERT INTO denied_refresh_tokens (jti, "expiresAt", "createdAt")
        VALUES (${jti}, ${expiresAt}, NOW())
        ON CONFLICT (jti) DO NOTHING
      `
      if (inserted === 1) return 'claimed'

      const existing = await prisma.deniedRefreshToken.findUnique({
        where: { jti },
        select: { expiresAt: true },
      })
      if (existing && existing.expiresAt.getTime() <= Date.now()) {
        await prisma.deniedRefreshToken.delete({ where: { jti } }).catch(() => undefined)
        try {
          await prisma.deniedRefreshToken.create({ data: { jti, expiresAt } })
          return 'claimed'
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return 'reuse'
          }
          throw error
        }
      }
      return 'reuse'
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
