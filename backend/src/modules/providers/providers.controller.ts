import type { NextFunction, Request, RequestHandler, Response } from 'express'
import multer from 'multer'

import { parseAuthActor } from '../../auth/auth-actor.js'
import type { ListProvidersQuery } from './providers.schema.js'
import type { ProvidersService } from './providers.service.js'

const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
})

export type ProvidersController = {
  list: (req: Request, res: Response, next: NextFunction) => Promise<void>
  listOwnerCandidates: (req: Request, res: Response, next: NextFunction) => Promise<void>
  getMine: (req: Request, res: Response, next: NextFunction) => Promise<void>
  getById: (req: Request, res: Response, next: NextFunction) => Promise<void>
  create: (req: Request, res: Response, next: NextFunction) => Promise<void>
  update: (req: Request, res: Response, next: NextFunction) => Promise<void>
  uploadLogo: (req: Request, res: Response, next: NextFunction) => Promise<void>
  clearLogo: (req: Request, res: Response, next: NextFunction) => Promise<void>
  uploadLogoMiddleware: RequestHandler
}

export function createProvidersController(service: ProvidersService): ProvidersController {
  return {
    uploadLogoMiddleware: logoUpload.single('image'),

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

    async getMine(req, res, next) {
      try {
        const result = await service.getMyProvider(parseAuthActor(req))
        res.status(200).json({
          data: result.provider,
          meta: { logoDownloadUrl: result.logoDownloadUrl },
        })
      } catch (error) {
        next(error)
      }
    },

    async getById(req, res, next) {
      try {
        const result = await service.getProviderById(String(req.params.id), parseAuthActor(req))
        res.status(200).json({
          data: result.provider,
          meta: { logoDownloadUrl: result.logoDownloadUrl },
        })
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

    async uploadLogo(req, res, next) {
      try {
        if (!req.file) {
          res.status(400).json({ error: 'No image file provided' })
          return
        }
        const result = await service.uploadLogo(
          String(req.params.id),
          req.file,
          parseAuthActor(req),
        )
        res.status(200).json({
          data: result.provider,
          meta: { logoDownloadUrl: result.logoDownloadUrl },
        })
      } catch (error) {
        next(error)
      }
    },

    async clearLogo(req, res, next) {
      try {
        const result = await service.clearLogo(String(req.params.id), parseAuthActor(req))
        res.status(200).json({
          data: result.provider,
          meta: { logoDownloadUrl: result.logoDownloadUrl },
        })
      } catch (error) {
        next(error)
      }
    },
  }
}
