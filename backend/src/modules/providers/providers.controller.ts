import type { NextFunction, Request, Response } from 'express'

import { parseAuthActor } from '../../auth/auth-actor.js'
import type { ListProvidersQuery } from './providers.schema.js'
import type { ProvidersService } from './providers.service.js'

export type ProvidersController = {
  list: (req: Request, res: Response, next: NextFunction) => Promise<void>
  listOwnerCandidates: (req: Request, res: Response, next: NextFunction) => Promise<void>
  getById: (req: Request, res: Response, next: NextFunction) => Promise<void>
  create: (req: Request, res: Response, next: NextFunction) => Promise<void>
  update: (req: Request, res: Response, next: NextFunction) => Promise<void>
}

export function createProvidersController(service: ProvidersService): ProvidersController {
  return {
    async list(req, res, next) {
      try {
        const result = await service.listProviders(
          req.query as unknown as ListProvidersQuery,
          parseAuthActor(req),
        )
        res.status(200).json(result)
      } catch (error) {
        next(error)
      }
    },

    async listOwnerCandidates(req, res, next) {
      try {
        const data = await service.listOwnerCandidates(parseAuthActor(req))
        res.status(200).json({ data })
      } catch (error) {
        next(error)
      }
    },

    async getById(req, res, next) {
      try {
        const provider = await service.getProviderById(String(req.params.id), parseAuthActor(req))
        res.status(200).json({ data: provider })
      } catch (error) {
        next(error)
      }
    },

    async create(req, res, next) {
      try {
        const provider = await service.createProvider(req.body, parseAuthActor(req))
        res.status(201).json({ data: provider })
      } catch (error) {
        next(error)
      }
    },

    async update(req, res, next) {
      try {
        const provider = await service.updateProvider(
          String(req.params.id),
          req.body,
          parseAuthActor(req),
        )
        res.status(200).json({ data: provider })
      } catch (error) {
        next(error)
      }
    },
  }
}
