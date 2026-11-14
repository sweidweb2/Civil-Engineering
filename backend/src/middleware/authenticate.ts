import type { RequestHandler } from 'express'

import { loadConfig } from '../config/index.js'
import { unauthorized } from '../errors/app-error.js'
import { ACCESS_COOKIE, parseCookieHeader } from '../modules/auth/auth.cookies.js'
import { verifyAccessToken } from '../modules/auth/auth.tokens.js'
import { createDbAccessPrincipalResolver, type ResolveAccessPrincipal } from './access-principal.js'

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

  return async (req, _res, next) => {
    try {
      const token = extractAccessToken(req)
      if (!token) {
        throw unauthorized()
      }

      const config = loadConfig()
      const payload = verifyAccessToken(config, token)
      resolvePrincipal ??= createDbAccessPrincipalResolver()
      const principal = await resolvePrincipal(payload.sub)

      if (!principal || principal.status !== 'ACTIVE') {
        throw unauthorized('Invalid or expired access token')
      }

      req.user = {
        id: principal.id,
        roles: [principal.role],
      }
      next()
    } catch (error) {
      if (error && typeof error === 'object' && 'status' in error) {
        next(error)
        return
      }
      next(unauthorized('Invalid or expired access token'))
    }
  }
}

/** Production guard (DB-backed principal resolver). */
export const authenticate: RequestHandler = createAuthenticate()
