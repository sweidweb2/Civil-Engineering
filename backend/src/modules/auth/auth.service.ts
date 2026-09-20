import type { AppConfig } from '../../config/index.js'
import {
  conflict,
  unauthorized,
} from '../../errors/app-error.js'
import type { AuthRepository, AuthUserRecord } from './auth.repository.js'
import type { LoginBody, RefreshBody, RegisterBody } from './auth.schema.js'
import type { RoleName } from './auth.schema.js'
import type { AuthTokens, AuthUserDto, LoginResult } from './auth.types.js'
import {
  hashPassword,
  signAccessToken,
  signRefreshToken,
  verifyPassword,
  verifyRefreshToken,
} from './auth.tokens.js'

export type AuthService = {
  register: (input: RegisterBody) => Promise<LoginResult>
  login: (input: LoginBody) => Promise<LoginResult>
  refreshTokens: (input: RefreshBody) => Promise<AuthTokens>
  logout: (input: RefreshBody) => Promise<void>
}

function toUserDto(user: AuthUserRecord): AuthUserDto {
  return {
    id: user.id,
    email: user.email,
    role: user.role as RoleName,
    profile: user.profile
      ? {
          firstName: user.profile.firstName,
          lastName: user.profile.lastName,
          displayName: user.profile.displayName,
        }
      : null,
  }
}

function issueTokens(config: AppConfig, user: AuthUserRecord): AuthTokens {
  const role = user.role as RoleName
  return {
    accessToken: signAccessToken(config, user.id, role),
    refreshToken: signRefreshToken(config, user.id, role),
  }
}

export function createAuthService(
  repository: AuthRepository,
  config: AppConfig
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

      return {
        user: toUserDto(user),
        tokens: issueTokens(config, user),
      }
    },

    async login(input) {
      const user = await repository.findByEmail(input.email)
      if (!user || user.status !== 'ACTIVE') {
        throw unauthorized('Invalid email or password')
      }

      const ok = await verifyPassword(input.password, user.passwordHash)
      if (!ok) {
        throw unauthorized('Invalid email or password')
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

      return issueTokens(config, user)
    },

    async logout() {
      // JWT-only refresh for now — client discards tokens. Server revocation TBD.
    },
  }
}
