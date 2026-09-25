import type { NextFunction, Request, Response } from 'express'

import { unauthorized } from '../../errors/app-error.js'
import type { ListProvidersQuery } from './providers.schema.js'
import type { ProvidersService } from './providers.service.js'

export type ProvidersController = {
  list: (req: Request, res: Response, next: NextFunction) => Promise<void>
  listOwnerCandidates: (req: Request, res: Response, next: NextFunction) => Promise<void>
  getById: (req: Request, res: Response, next: NextFunction) => Promise<void>
  create: (req: Request, res: Response, next: NextFunction) => Promise<void>
  update: (req: Request, res: Response, next: NextFunction) => Promise<void>
}

function requireActor(req: Request) {
  if (!req.user) {
    throw unauthorized()
  }
  return { id: req.user.id, roles: req.user.roles }
}

export function createProvidersController(service: ProvidersService): ProvidersController {
  return {
    async list(req, res, next) {
      try {
        const result = await service.listProviders(
          req.query as unknown as ListProvidersQuery,
          requireActor(req),
        )
        res.status(200).json(result)
      } catch (error) {
        next(error)
      }
    },

    async listOwnerCandidates(req, res, next) {
      try {
        const data = await service.listOwnerCandidates(requireActor(req))
        res.status(200).json({ data })
      } catch (error) {
        next(error)
      }
    },

    async getById(req, res, next) {
      try {
        const provider = await service.getProviderById(String(req.params.id), requireActor(req))
        res.status(200).json(provider)
      } catch (error) {
        next(error)
      }
    },

    async create(req, res, next) {
      try {
        const provider = await service.createProvider(req.body, requireActor(req))
        res.status(201).json(provider)
      } catch (error) {
        next(error)
      }
    },

    async update(req, res, next) {
      try {
        const provider = await service.updateProvider(String(req.params.id), req.body, requireActor(req))
        res.status(200).json(provider)
      } catch (error) {
        next(error)
      }
    },
  }
}
