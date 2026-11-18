import type { AppConfig } from '../../config/index.js'
import { translateUniqueConflict } from '../../database/unique-conflict.js'
import { conflict, isUniqueConflictError, unauthorized } from '../../errors/app-error.js'
import { ErrorCodes } from '../../errors/error-codes.js'
import { enqueuePurgeExpiredDeniedRefreshTokens } from '../../jobs/index.js'
import { getLogger } from '../../logging/index.js'
import type { LoggingService } from '../logging/index.js'
import type { AuthRepository, AuthUserRecord } from './auth.repository.js'
import type { ChangePasswordBody, LoginBody, RefreshBody, RegisterBody } from './auth.schema.js'
import type { RoleName } from './auth.schema.js'
import {
  hashPassword,
  refreshTtlSeconds,
  signAccessToken,
  signRefreshToken,
  verifyPassword,
  verifyRefreshToken,
} from './auth.tokens.js'
import type {
  AuthTokens,
  AuthUserDto,
  LoginResult,
  RegisterContext,
  RegisterResult,
} from './auth.types.js'

/** Lifetime self-serve registrations allowed per device fingerprint. */
export const MAX_REGISTRATIONS_PER_DEVICE = 5

export type AuthService = {
  register: (input: RegisterBody, context: RegisterContext) => Promise<RegisterResult>
  login: (input: LoginBody) => Promise<LoginResult>
  refreshTokens: (input: RefreshBody) => Promise<AuthTokens>
  logout: (input: RefreshBody) => Promise<void>
  changePassword: (userId: string, input: ChangePasswordBody) => Promise<void>
}

function toUserDto(user: AuthUserRecord): AuthUserDto {
  return {
    id: user.id,
    email: user.email,
    role: user.role as RoleName,
    status: user.status,
    isVerified: user.isVerified,
    profile: user.profile
      ? {
          firstName: user.profile.firstName,
          lastName: user.profile.lastName,
          displayName: user.profile.displayName,
        }
      : null,
  }
}

const DENIED_REFRESH_PURGE_MIN_INTERVAL_MS = 60 * 60 * 1000
let lastDeniedRefreshPurgeAt = 0

function maybePurgeDeniedRefreshTokens(): void {
  const now = Date.now()
  if (now - lastDeniedRefreshPurgeAt < DENIED_REFRESH_PURGE_MIN_INTERVAL_MS) return
  lastDeniedRefreshPurgeAt = now
  void enqueuePurgeExpiredDeniedRefreshTokens()
}

function issueTokens(config: AppConfig, user: AuthUserRecord): AuthTokens {
  const role = user.role as RoleName
  return {
    accessToken: signAccessToken(config, user.id, role),
    refreshToken: signRefreshToken(config, user.id, role),
  }
}

/** Deny a refresh jti until expiry (logout — idempotent). */
async function denyRefreshToken(
  repository: AuthRepository,
  jti: string,
  ttlSec: number,
): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlSec * 1000)
  await repository.denyRefreshJti(jti, expiresAt)
}

/** Atomically claim jti for rotation; losers are treated as reuse. */
async function claimRefreshToken(
  repository: AuthRepository,
  jti: string,
  ttlSec: number,
): Promise<'claimed' | 'reuse'> {
  const expiresAt = new Date(Date.now() + ttlSec * 1000)
  return repository.claimRefreshJti(jti, expiresAt)
}

function statusForRegisterRole(role: RegisterBody['role']): 'ACTIVE' | 'PENDING' {
  return role === 'CLIENT' ? 'ACTIVE' : 'PENDING'
}

export function createAuthService(
  repository: AuthRepository,
  config: AppConfig,
  logging?: LoggingService,
): AuthService {
  return {
    async register(input, context) {
      const existing = await repository.findByEmail(input.email)
      if (existing) {
        throw conflict('Email already registered')
      }

      const role = input.role
      const status = statusForRegisterRole(role)
      const passwordHash = await hashPassword(input.password)
      let user: AuthUserRecord
      try {
        const result = await translateUniqueConflict(() =>
          repository.createUserWithDeviceCap({
            email: input.email,
            passwordHash,
            role,
            status,
            firstName: input.firstName,
            lastName: input.lastName,
            deviceId: input.deviceId,
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
            maxRegistrations: MAX_REGISTRATIONS_PER_DEVICE,
          }),
        )
        if (result.outcome === 'device_limit') {
          throw conflict(
            'This device has reached the maximum number of registrations',
            ErrorCodes.REGISTRATION_DEVICE_LIMIT,
          )
        }
        user = result.user
      } catch (error) {
        if (isUniqueConflictError(error)) {
          throw conflict('Email already registered')
        }
        throw error
      }

      try {
        await logging?.recordActivity({
          userId: user.id,
          action: 'auth.register',
          entity: 'user',
          entityId: user.id,
        })
      } catch (error) {
        getLogger().error({ err: error }, 'failed to write register activity')
      }

      const pendingApproval = status === 'PENDING'
      return {
        user: toUserDto(user),
        tokens: pendingApproval ? null : issueTokens(config, user),
        pendingApproval,
      }
    },

    async login(input) {
      const user = await repository.findByEmail(input.email)
      if (!user) {
        throw unauthorized('Invalid email or password')
      }

      const ok = await verifyPassword(input.password, user.passwordHash)
      if (!ok) {
        throw unauthorized('Invalid email or password')
      }

      if (user.status === 'PENDING') {
        throw unauthorized('Account is pending admin approval', ErrorCodes.ACCOUNT_PENDING)
      }

      if (user.status !== 'ACTIVE') {
        throw unauthorized('Invalid email or password')
      }

      try {
        await logging?.recordActivity({
          userId: user.id,
          action: 'auth.login',
          entity: 'user',
          entityId: user.id,
        })
      } catch (error) {
        getLogger().error({ err: error }, 'failed to write login activity')
      }

      return {
        user: toUserDto(user),
        tokens: issueTokens(config, user),
      }
    },

    async refreshTokens(input) {
      let payload
      try {
        payload = verifyRefreshToken(config, input.refreshToken)
      } catch {
        throw unauthorized('Invalid or expired refresh token')
      }

      const user = await repository.findById(payload.sub)
      if (!user || user.status !== 'ACTIVE') {
        throw unauthorized('Invalid or expired refresh token')
      }

      // Password change stamps refreshInvalidBefore; reject older refresh JWTs.
      if (
        user.refreshInvalidBefore &&
        typeof payload.iat === 'number' &&
        payload.iat * 1000 < user.refreshInvalidBefore.getTime()
      ) {
        throw unauthorized('Invalid or expired refresh token')
      }

      // Atomic single-use claim — concurrent refreshes of the same jti cannot both win.
      const claim = await claimRefreshToken(repository, payload.jti, refreshTtlSeconds(payload))
      if (claim === 'reuse') {
        throw unauthorized('Invalid or expired refresh token')
      }

      // Best-effort denylist GC (covers serverless where the hourly scheduler does not run).
      void maybePurgeDeniedRefreshTokens()

      return issueTokens(config, user)
    },

    async logout(input) {
      let userId: string | undefined
      try {
        const payload = verifyRefreshToken(config, input.refreshToken)
        userId = payload.sub
        await denyRefreshToken(repository, payload.jti, refreshTtlSeconds(payload))
      } catch {
        // Client still discards tokens; logging is best-effort.
      }

      try {
        await logging?.recordActivity({
          userId: userId ?? null,
          action: 'auth.logout',
          entity: 'user',
          entityId: userId ?? null,
        })
      } catch (error) {
        getLogger().error({ err: error }, 'failed to write logout activity')
      }
    },

    async changePassword(userId, input) {
      const user = await repository.findById(userId)
      if (!user || user.status !== 'ACTIVE') {
        throw unauthorized()
      }

      const ok = await verifyPassword(input.currentPassword, user.passwordHash)
      if (!ok) {
        throw unauthorized('Current password is incorrect')
      }

      const passwordHash = await hashPassword(input.newPassword)
      await repository.updatePasswordHashAndInvalidateRefresh(userId, passwordHash)

      try {
        await logging?.recordActivity({
          userId,
          action: 'auth.change_password',
          entity: 'user',
          entityId: userId,
        })
      } catch (error) {
        getLogger().error({ err: error }, 'failed to write change-password activity')
      }
    },
  }
}
