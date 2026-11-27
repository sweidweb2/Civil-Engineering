import type { AppConfig } from '../../config/index.js'
import { translateUniqueConflict } from '../../database/unique-conflict.js'
import { conflict, isUniqueConflictError, unauthorized } from '../../errors/app-error.js'
import { ErrorCodes } from '../../errors/error-codes.js'
import { purgeExpiredDeniedRefreshTokens } from '../../jobs/index.js'
import { getRequestLogger, hashEmailHint } from '../../logging/index.js'
import { auditActivity, type LoggingService } from '../logging/index.js'
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
  /** Invalidates other devices' refresh tokens and returns a fresh session for this device. */
  changePassword: (userId: string, input: ChangePasswordBody) => Promise<AuthTokens>
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
  void purgeExpiredDeniedRefreshTokens()
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

function warnAuthFailure(reason: string, fields: Record<string, unknown> = {}): void {
  getRequestLogger().warn({ kind: 'auth.failure', reason, ...fields }, `auth failure: ${reason}`)
}

export function createAuthService(
  repository: AuthRepository,
  config: AppConfig,
  _logging?: LoggingService,
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
          warnAuthFailure('registration_device_limit', {
            emailHint: hashEmailHint(input.email),
            deviceId: input.deviceId,
          })
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

      auditActivity({
        userId: user.id,
        action: 'auth.register',
        entity: 'user',
        entityId: user.id,
        meta: { role: user.role, status: user.status },
      })

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
        warnAuthFailure('bad_credentials', { emailHint: hashEmailHint(input.email) })
        throw unauthorized('Invalid email or password')
      }

      const ok = await verifyPassword(input.password, user.passwordHash)
      if (!ok) {
        warnAuthFailure('bad_credentials', {
          userId: user.id,
          emailHint: hashEmailHint(input.email),
        })
        throw unauthorized('Invalid email or password')
      }

      if (user.status === 'PENDING') {
        warnAuthFailure('account_pending', { userId: user.id })
        throw unauthorized('Account is pending admin approval', ErrorCodes.ACCOUNT_PENDING)
      }

      if (user.status !== 'ACTIVE') {
        warnAuthFailure('account_inactive', { userId: user.id, status: user.status })
        throw unauthorized('Invalid email or password')
      }

      auditActivity({
        userId: user.id,
        action: 'auth.login',
        entity: 'user',
        entityId: user.id,
      })

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
        warnAuthFailure('refresh_invalid')
        throw unauthorized('Invalid or expired refresh token')
      }

      const user = await repository.findById(payload.sub)
      if (!user || user.status !== 'ACTIVE') {
        warnAuthFailure('refresh_user_inactive', { userId: payload.sub })
        throw unauthorized('Invalid or expired refresh token')
      }

      // Password change stamps refreshInvalidBefore. Compare in whole seconds so
      // JWT iat (second precision) is not rejected when issued in the same second.
      if (user.refreshInvalidBefore) {
        if (typeof payload.iat !== 'number') {
          warnAuthFailure('refresh_invalid_before', { userId: user.id })
          throw unauthorized('Invalid or expired refresh token')
        }
        const cutoffSec = Math.floor(user.refreshInvalidBefore.getTime() / 1000)
        if (payload.iat < cutoffSec) {
          warnAuthFailure('refresh_invalid_before', { userId: user.id })
          throw unauthorized('Invalid or expired refresh token')
        }
      }

      // Atomic single-use claim — concurrent refreshes of the same jti cannot both win.
      const claim = await claimRefreshToken(repository, payload.jti, refreshTtlSeconds(payload))
      if (claim === 'reuse') {
        warnAuthFailure('refresh_reuse', { userId: user.id })
        // Stolen/replayed refresh: invalidate every outstanding refresh for this user.
        await repository.invalidateRefreshTokens(user.id).catch((error) => {
          getRequestLogger().warn(
            { err: error, userId: user.id, kind: 'auth.refresh_reuse_revoke_failed' },
            'failed to revoke sessions after refresh reuse',
          )
        })
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
        try {
          await denyRefreshToken(repository, payload.jti, refreshTtlSeconds(payload))
        } catch (error) {
          getRequestLogger().warn(
            { err: error, userId, kind: 'auth.logout_deny_failed' },
            'failed to deny refresh token on logout',
          )
        }
      } catch {
        // Client still discards tokens; no valid refresh to deny.
      }

      auditActivity({
        userId: userId ?? null,
        action: 'auth.logout',
        entity: 'user',
        entityId: userId ?? null,
      })
    },

    async changePassword(userId, input) {
      const user = await repository.findById(userId)
      if (!user || user.status !== 'ACTIVE') {
        throw unauthorized()
      }

      const ok = await verifyPassword(input.currentPassword, user.passwordHash)
      if (!ok) {
        warnAuthFailure('bad_current_password', { userId })
        throw unauthorized('Current password is incorrect')
      }

      const passwordHash = await hashPassword(input.newPassword)
      await repository.updatePasswordHashAndInvalidateRefresh(userId, passwordHash)

      auditActivity({
        userId,
        action: 'auth.change_password',
        entity: 'user',
        entityId: userId,
      })

      // Re-issue for this device so the caller is not logged out after invalidating others.
      return issueTokens(config, user)
    },
  }
}
