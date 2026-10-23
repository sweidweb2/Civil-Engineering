import type { Response } from 'express'

import type { AppConfig } from '../../config/index.js'
import type { AuthTokens } from './auth.types.js'

export const ACCESS_COOKIE = 'civil_access'
export const REFRESH_COOKIE = 'civil_refresh'

type CookieOptions = {
  maxAgeSec: number
  path: string
  httpOnly: boolean
  secure: boolean
  sameSite: 'Lax' | 'Strict' | 'None'
}

function serializeCookie(name: string, value: string, options: CookieOptions): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Max-Age=${Math.max(0, Math.floor(options.maxAgeSec))}`,
    `Path=${options.path}`,
    `SameSite=${options.sameSite}`,
  ]
  if (options.httpOnly) parts.push('HttpOnly')
  if (options.secure) parts.push('Secure')
  return parts.join('; ')
}

function clearCookie(name: string, path: string, secure: boolean): string {
  return serializeCookie(name, '', {
    maxAgeSec: 0,
    path,
    httpOnly: true,
    secure,
    sameSite: 'Lax',
  })
}

export function parseCookieHeader(header: string | undefined): Record<string, string> {
  if (!header) return {}
  const out: Record<string, string> = {}
  for (const part of header.split(';')) {
    const index = part.indexOf('=')
    if (index === -1) continue
    const key = part.slice(0, index).trim()
    const value = part.slice(index + 1).trim()
    if (!key) continue
    try {
      out[key] = decodeURIComponent(value)
    } catch {
      out[key] = value
    }
  }
  return out
}

function cookieSecure(config: AppConfig): boolean {
  return config.env === 'staging' || config.env === 'production'
}

/** Access JWT: sent on all /api/v1 requests. Refresh: auth routes only. */
export function setAuthCookies(res: Response, tokens: AuthTokens, config: AppConfig): void {
  const secure = cookieSecure(config)
  res.appendHeader(
    'Set-Cookie',
    serializeCookie(ACCESS_COOKIE, tokens.accessToken, {
      maxAgeSec: 15 * 60,
      path: '/api/v1',
      httpOnly: true,
      secure,
      sameSite: 'Lax',
    }),
  )
  res.appendHeader(
    'Set-Cookie',
    serializeCookie(REFRESH_COOKIE, tokens.refreshToken, {
      maxAgeSec: 7 * 24 * 3600,
      path: '/api/v1/auth',
      httpOnly: true,
      secure,
      sameSite: 'Lax',
    }),
  )
}

export function clearAuthCookies(res: Response, config: AppConfig): void {
  const secure = cookieSecure(config)
  res.appendHeader('Set-Cookie', clearCookie(ACCESS_COOKIE, '/api/v1', secure))
  res.appendHeader('Set-Cookie', clearCookie(REFRESH_COOKIE, '/api/v1/auth', secure))
}
