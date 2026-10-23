import type { RequestHandler } from 'express'

import { loadConfig } from '../config/index.js'
import { unauthorized } from '../errors/app-error.js'
import {
  ACCESS_COOKIE,
  parseCookieHeader,
} from '../modules/auth/auth.cookies.js'
import { verifyAccessToken } from '../modules/auth/auth.tokens.js'
import { getAccessPrincipalResolver } from './access-principal.js'

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
 * Require a valid access JWT (Bearer or httpOnly cookie).
 * Role / status are loaded from the DB so demotions apply before access TTL.
 */
export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const token = extractAccessToken(req)
    if (!token) {
      throw unauthorized()
    }

    const config = loadConfig()
    const payload = verifyAccessToken(config, token)
    const principal = await getAccessPrincipalResolver()(payload.sub)

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
