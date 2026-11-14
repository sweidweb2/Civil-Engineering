import type { AppConfig } from '../../config/index.js'
import { conflict, unauthorized } from '../../errors/app-error.js'
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
import type { AuthTokens, AuthUserDto, LoginResult } from './auth.types.js'

export type AuthService = {
  register: (input: RegisterBody) => Promise<LoginResult>
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

/** Deny a refresh jti until expiry. Postgres (Supabase) is the sole store. */
async function denyRefreshToken(
  repository: AuthRepository,
  _config: AppConfig,
  jti: string,
  ttlSec: number,
): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlSec * 1000)
  await repository.denyRefreshJti(jti, expiresAt)
}

async function isRefreshDenied(
  repository: AuthRepository,
  _config: AppConfig,
  jti: string,
): Promise<boolean> {
  return repository.isRefreshJtiDenied(jti)
}

export function createAuthService(
  repository: AuthRepository,
  config: AppConfig,
  logging?: LoggingService,
): AuthService {
  return {
    async register(input) {
      const existing = await repository.findByEmail(input.email)
      if (existing) {
        throw conflict('Email already registered')
      }

      const passwordHash = await hashPassword(input.password)
      const user = await repository.createUserWithProfile({
        email: input.email,
        passwordHash,
        role: 'CLIENT',
        firstName: input.firstName,
        lastName: input.lastName,
      })

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

      return {
        user: toUserDto(user),
        tokens: issueTokens(config, user),
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
        throw unauthorized('Account is pending admin approval', 'ACCOUNT_PENDING')
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

      if (await isRefreshDenied(repository, config, payload.jti)) {
        throw unauthorized('Invalid or expired refresh token')
      }

      const user = await repository.findById(payload.sub)
      if (!user || user.status !== 'ACTIVE') {
        throw unauthorized('Invalid or expired refresh token')
      }

      // Rotate: denylist the presented refresh before issuing a new pair.
      await denyRefreshToken(repository, config, payload.jti, refreshTtlSeconds(payload))

      // Best-effort denylist GC (covers serverless where the hourly scheduler does not run).
      void maybePurgeDeniedRefreshTokens()

      return issueTokens(config, user)
    },

    async logout(input) {
      let userId: string | undefined
      try {
        const payload = verifyRefreshToken(config, input.refreshToken)
        userId = payload.sub
        await denyRefreshToken(repository, config, payload.jti, refreshTtlSeconds(payload))
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
      await repository.updatePasswordHash(userId, passwordHash)

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
