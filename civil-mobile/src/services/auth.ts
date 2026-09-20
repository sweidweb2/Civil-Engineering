import { apiRequest } from './api'

export type AuthRole =
  | 'SUPER'
  | 'ADMIN'
  | 'PROVIDER'
  | 'WORKER'
  | 'MANAGER'
  | 'CLIENT'

export type AuthUser = {
  id: string
  email: string
  role: AuthRole
  profile: {
    firstName: string | null
    lastName: string | null
    displayName: string | null
  } | null
}

export type AuthTokens = {
  accessToken: string
  refreshToken: string
}

export type AuthResponse = {
  user: AuthUser
  tokens: AuthTokens
}

export function login(email: string, password: string) {
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function register(input: {
  email: string
  password: string
  firstName?: string
  lastName?: string
}) {
  return apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function logout(refreshToken: string) {
  return apiRequest<void>('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  })
}
