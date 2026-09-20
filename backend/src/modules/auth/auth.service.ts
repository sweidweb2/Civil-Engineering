import { notImplemented } from '../../errors/app-error.js'
import type { AuthRepository } from './auth.repository.js'
import type { LoginBody, RefreshBody, RegisterBody } from './auth.schema.js'
import type { AuthTokens, LoginResult } from './auth.types.js'

export type AuthService = {
  register: (input: RegisterBody) => Promise<LoginResult>
  login: (input: LoginBody) => Promise<LoginResult>
  refreshTokens: (input: RefreshBody) => Promise<AuthTokens>
  logout: (input: RefreshBody) => Promise<void>
}

export function createAuthService(_repository: AuthRepository): AuthService {
  return {
    async register() {
      throw notImplemented('auth.register')
    },
    async login() {
      throw notImplemented('auth.login')
    },
    async refreshTokens() {
      throw notImplemented('auth.refreshTokens')
    },
    async logout() {
      throw notImplemented('auth.logout')
    },
  }
}
