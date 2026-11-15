import type { RoleName } from './auth.schema.js'

export type AuthTokens = {
  accessToken: string
  refreshToken: string
}

export type AuthProfileDto = {
  firstName: string | null
  lastName: string | null
  displayName: string | null
}

export type AuthUserDto = {
  id: string
  email: string
  role: RoleName
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING'
  isVerified: boolean
  profile: AuthProfileDto | null
}

export type LoginResult = {
  user: AuthUserDto
  tokens: AuthTokens
}

export type RegisterResult = {
  user: AuthUserDto
  /** Null when the account awaits admin approval (WORKER / MANAGER). */
  tokens: AuthTokens | null
  pendingApproval: boolean
}

export type RegisterContext = {
  ipAddress: string | null
  userAgent: string | null
}
