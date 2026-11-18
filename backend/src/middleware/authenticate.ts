import type { RequestHandler } from 'express'

import { loadConfig } from '../config/index.js'
import { unauthorized } from '../errors/app-error.js'
import { logPerf } from '../logging/perf.js'
import type { RoleName } from '../modules/auth/auth.schema.js'
import { ACCESS_COOKIE, parseCookieHeader } from '../modules/auth/auth.cookies.js'
import { verifyAccessToken } from '../modules/auth/auth.tokens.js'
import { createDbAccessPrincipalResolver, type ResolveAccessPrincipal } from './access-principal.js'
import { pushServerTiming } from './perf-timing.js'

export type AuthenticateDeps = {
  resolvePrincipal?: ResolveAccessPrincipal
}

function extractAccessToken(req: {
  headers: { authorization?: string; cookie?: string }
}): string | null {
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) {
    const token = header.slice('Bearer '.length).trim()
    if (token) return token
  }

  const cookies = parseCookieHeader(req.headers.cookie)
  const fromCookie = cookies[ACCESS_COOKIE]?.trim()
  return fromCookie || null
}

async function resolveActiveUser(
  token: string,
  resolvePrincipal: ResolveAccessPrincipal,
): Promise<{ id: string; role: RoleName; jwtMs: number; principalMs: number }> {
  const jwtStarted = performance.now()
  const payload = verifyAccessToken(loadConfig(), token)
  const jwtMs = Math.round(performance.now() - jwtStarted)

  const principalStarted = performance.now()
  const principal = await resolvePrincipal(payload.sub)
  const principalMs = Math.round(performance.now() - principalStarted)

  if (!principal || principal.status !== 'ACTIVE') {
    throw unauthorized('Invalid or expired access token')
  }

  return { id: principal.id, role: principal.role, jwtMs, principalMs }
}

function failAuth(
  next: Parameters<RequestHandler>[2],
  authStarted: number,
  label: string,
  error: unknown,
) {
  const authMs = Math.round(performance.now() - authStarted)
  logPerf('auth', `${label} failed ${authMs}ms`, { ms: authMs, failed: true })
  if (error && typeof error === 'object' && 'status' in error) {
    next(error)
    return
  }
  next(unauthorized('Invalid or expired access token'))
}

/**
 * Build an access-JWT guard.
 *
 * Dual transport (intentional, both stay):
 * - `Authorization: Bearer <jwt>` — mobile / API clients; not ambient, so no CSRF risk.
 * - `civil_access` httpOnly cookie — web client; ambient credential, so cookie-authenticated
 *   mutating requests must also pass `requireTrustedOrigin` (CSRF defense, wired in `createApp`).
 *
 * Role / status are loaded from the DB so demotions apply before access TTL.
 * Pass `resolvePrincipal` to inject a resolver (tests); the default DB resolver is created
 * lazily, once per factory.
 */
export function createAuthenticate(deps: AuthenticateDeps = {}): RequestHandler {
  let resolvePrincipal = deps.resolvePrincipal

  return async (req, res, next) => {
    const authStarted = performance.now()
    try {
      const token = extractAccessToken(req)
      if (!token) {
        throw unauthorized()
      }

      resolvePrincipal ??= createDbAccessPrincipalResolver()
      const { id, role, jwtMs, principalMs } = await resolveActiveUser(token, resolvePrincipal)

      req.user = { id, roles: [role] }

      const authMs = Math.round(performance.now() - authStarted)
      pushServerTiming(res, 'auth', authMs)
      logPerf('auth', `authenticate ${authMs}ms (jwt=${jwtMs}ms principal=${principalMs}ms)`, {
        ms: authMs,
        jwtMs,
        principalMs,
        userId: id,
      })
      next()
    } catch (error) {
      failAuth(next, authStarted, 'authenticate', error)
    }
  }
}

/**
 * Same credential rules as `authenticate`, but missing credentials become a guest
 * (`req.user` unset) so public marketplace reads can proceed. Invalid/expired tokens
 * still fail closed with 401.
 */
export function createOptionalAuthenticate(deps: AuthenticateDeps = {}): RequestHandler {
  let resolvePrincipal = deps.resolvePrincipal

  return async (req, res, next) => {
    const authStarted = performance.now()
    const token = extractAccessToken(req)
    if (!token) {
      next()
      return
    }

    try {
      resolvePrincipal ??= createDbAccessPrincipalResolver()
      const { id, role, jwtMs, principalMs } = await resolveActiveUser(token, resolvePrincipal)

      req.user = { id, roles: [role] }

      const authMs = Math.round(performance.now() - authStarted)
      pushServerTiming(res, 'auth', authMs)
      logPerf(
        'auth',
        `optionalAuthenticate ${authMs}ms (jwt=${jwtMs}ms principal=${principalMs}ms)`,
        {
          ms: authMs,
          jwtMs,
          principalMs,
          userId: id,
        },
      )
      next()
    } catch (error) {
      failAuth(next, authStarted, 'optionalAuthenticate', error)
    }
  }
}

/** Production guard (DB-backed principal resolver). */
export const authenticate: RequestHandler = createAuthenticate()

/** Production optional guard for public marketplace reads. */
export const optionalAuthenticate: RequestHandler = createOptionalAuthenticate()
