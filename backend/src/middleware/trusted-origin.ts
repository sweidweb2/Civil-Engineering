import type { RequestHandler } from 'express'

import { forbidden } from '../errors/app-error.js'
import { getRequestLogger } from '../logging/index.js'
import { ACCESS_COOKIE, parseCookieHeader, REFRESH_COOKIE } from '../modules/auth/auth.cookies.js'
import { clientIp } from '../modules/auth/client-meta.js'

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

function normalizeOrigin(value: string): string | null {
  try {
    const url = new URL(value)
    if (url.origin === 'null') return null
    return url.origin
  } catch {
    return null
  }
}

function hasBearer(authorization: string | undefined): boolean {
  if (!authorization?.startsWith('Bearer ')) return false
  return authorization.slice('Bearer '.length).trim().length > 0
}

/**
 * CSRF defense for cookie-authenticated browser requests.
 *
 * For unsafe methods, when the request carries auth cookies and no Bearer token, the
 * `Origin` (or, if absent, `Referer`) must match an allowed CORS origin. Bearer requests and
 * requests with no auth cookies are not ambient-credential requests and are skipped.
 * Covers refresh/logout too, since they accept the refresh cookie.
 *
 * Native clients (React Native) often replay Set-Cookie jars with neither Origin nor Referer.
 * Browsers send Origin on mutating credentialed requests, so missing both is treated as
 * non-browser and allowed. A present but untrusted Origin/Referer is still rejected.
 */
export function requireTrustedOrigin(allowedOrigins: readonly string[]): RequestHandler {
  const allowed = new Set(
    allowedOrigins.map((origin) => normalizeOrigin(origin)).filter((o): o is string => o !== null),
  )

  return (req, _res, next) => {
    if (!UNSAFE_METHODS.has(req.method)) {
      next()
      return
    }
    if (hasBearer(req.headers.authorization)) {
      next()
      return
    }

    const cookies = parseCookieHeader(req.headers.cookie)
    if (!cookies[ACCESS_COOKIE] && !cookies[REFRESH_COOKIE]) {
      next()
      return
    }

    const originHeader = req.headers.origin
    const refererHeader = req.headers.referer
    if (originHeader === undefined && refererHeader === undefined) {
      next()
      return
    }

    const source = originHeader ?? refererHeader
    const origin = source ? normalizeOrigin(source) : null
    if (!origin || !allowed.has(origin)) {
      getRequestLogger().warn(
        {
          kind: 'security.untrusted_origin',
          method: req.method,
          path: (req.originalUrl || req.url).split('?')[0],
          origin: origin ?? null,
          ip: clientIp(req),
        },
        'untrusted request origin',
      )
      next(forbidden('Untrusted request origin', 'UNTRUSTED_ORIGIN'))
      return
    }
    next()
  }
}
