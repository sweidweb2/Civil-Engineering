import { apiRequest, applySessionTokens, type AuthTokens, refreshTokens } from './api'
import { getDeviceId } from './deviceId'

export type AuthRole = 'SUPER' | 'ADMIN' | 'PROVIDER' | 'WORKER' | 'MANAGER' | 'CLIENT'

export type RegisterRole = 'CLIENT' | 'WORKER' | 'MANAGER'

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING'

export type AuthUser = {
  id: string
  email: string
  role: AuthRole
  status?: UserStatus
  isVerified: boolean
  profile: {
    firstName: string | null
    lastName: string | null
    displayName: string | null
  } | null
}

export type { AuthTokens }

export type AuthResponse = {
  user: AuthUser
  tokens: AuthTokens
}

export type RegisterResponse = {
  user: AuthUser
  tokens: AuthTokens | null
  pendingApproval: boolean
}

export function login(email: string, password: string) {
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    skipAuthRefresh: true,
  })
}

export function register(input: {
  email: string
  password: string
  firstName?: string
  lastName?: string
  role: RegisterRole
}) {
  return apiRequest<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ ...input, deviceId: getDeviceId() }),
    skipAuthRefresh: true,
  })
}

export function refresh(refreshToken: string) {
  return refreshTokens(refreshToken)
}

export function logout(refreshToken?: string | null) {
  return apiRequest<void>('/auth/logout', {
    method: 'POST',
    body: JSON.stringify(refreshToken ? { refreshToken } : {}),
    skipAuthRefresh: true,
  })
}

export async function changePassword(input: {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}) {
  const tokens = await apiRequest<AuthTokens>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  applySessionTokens(tokens)
  return tokens
}
