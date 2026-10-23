import type { NextFunction, Request, Response } from 'express'

import { unauthorized } from '../../errors/app-error.js'
import type { AuthService } from './auth.service.js'

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

export function createAuthController(service: AuthService): AuthController {
  return {
    async register(req, res, next) {
      try {
        const result = await service.register(req.body)
        res.status(201).json(result)
      } catch (error) {
        next(error)
      }
    },
    async login(req, res, next) {
      try {
        const result = await service.login(req.body)
        res.status(200).json(result)
      } catch (error) {
        next(error)
      }
    },
    async refresh(req, res, next) {
      try {
        const result = await service.refreshTokens(req.body)
        res.status(200).json(result)
      } catch (error) {
        next(error)
      }
    },
    async logout(req, res, next) {
      try {
        await service.logout(req.body)
        res.status(204).send()
      } catch (error) {
        next(error)
      }
    },
    async changePassword(req, res, next) {
      try {
        const userId = requireUserId(req)
        await service.changePassword(userId, req.body)
        res.status(204).send()
      } catch (error) {
        next(error)
      }
    },
  }
}
