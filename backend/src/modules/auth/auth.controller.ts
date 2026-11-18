import type { NextFunction, Request, Response } from 'express'

import type { AppConfig } from '../../config/index.js'
import { unauthorized, validationError } from '../../errors/app-error.js'
import {
  clearAuthCookies,
  parseCookieHeader,
  REFRESH_COOKIE,
  setAuthCookies,
} from './auth.cookies.js'
import type { AuthService } from './auth.service.js'
import { clientIp, clientUserAgent } from './client-meta.js'

export type AuthController = {
  register: (req: Request, res: Response, next: NextFunction) => Promise<void>
  login: (req: Request, res: Response, next: NextFunction) => Promise<void>
  refresh: (req: Request, res: Response, next: NextFunction) => Promise<void>
  logout: (req: Request, res: Response, next: NextFunction) => Promise<void>
  changePassword: (req: Request, res: Response, next: NextFunction) => Promise<void>
}

function requireUserId(req: Request): string {
  if (!req.user?.id) {
    throw unauthorized()
  }
  return req.user.id
}

function resolveRefreshToken(req: Request): string {
  const fromBody =
    typeof req.body?.refreshToken === 'string' && req.body.refreshToken.trim()
      ? String(req.body.refreshToken).trim()
      : ''
  if (fromBody) return fromBody

  const cookies = parseCookieHeader(req.headers.cookie)
  const fromCookie = cookies[REFRESH_COOKIE]?.trim()
  if (fromCookie) return fromCookie

  throw validationError('Refresh token is required')
}

export function createAuthController(service: AuthService, config: AppConfig): AuthController {
  return {
    async register(req, res, next) {
      try {
        const result = await service.register(req.body, {
          ipAddress: clientIp(req),
          userAgent: clientUserAgent(req),
        })
        if (result.tokens) {
          setAuthCookies(res, result.tokens, config)
        } else {
          clearAuthCookies(res, config)
        }
        res.status(201).json(result)
      } catch (error) {
        next(error)
      }
    },
    async login(req, res, next) {
      try {
        const result = await service.login(req.body)
        setAuthCookies(res, result.tokens, config)
        res.status(200).json(result)
      } catch (error) {
        next(error)
      }
    },
    async refresh(req, res, next) {
      try {
        const refreshToken = resolveRefreshToken(req)
        const tokens = await service.refreshTokens({ refreshToken })
        setAuthCookies(res, tokens, config)
        res.status(200).json(tokens)
      } catch (error) {
        next(error)
      }
    },
    async logout(req, res, next) {
      try {
        try {
          const refreshToken = resolveRefreshToken(req)
          await service.logout({ refreshToken })
        } catch {
          // Still clear cookies when the client has already discarded tokens.
        }
        clearAuthCookies(res, config)
        res.status(204).send()
      } catch (error) {
        next(error)
      }
    },
    async changePassword(req, res, next) {
      try {
        const userId = requireUserId(req)
        const tokens = await service.changePassword(userId, req.body)
        res.status(200).json(tokens)
      } catch (error) {
        next(error)
      }
    },
  }
}
