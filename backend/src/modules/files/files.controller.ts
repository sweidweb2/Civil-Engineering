import type { NextFunction, Request, Response } from 'express'

import { parseAuthActor } from '../../auth/auth-actor.js'
import type { FilesService } from './files.service.js'

export type FilesController = {
  presign: (req: Request, res: Response, next: NextFunction) => Promise<void>
  complete: (req: Request, res: Response, next: NextFunction) => Promise<void>
  downloadUrl: (req: Request, res: Response, next: NextFunction) => Promise<void>
  softDelete: (req: Request, res: Response, next: NextFunction) => Promise<void>
}

export function createFilesController(service: FilesService): FilesController {
  return {
    async presign(req, res, next) {
      try {
        const result = await service.presign(parseAuthActor(req), req.body)
        res.status(201).json(result)
      } catch (error) {
        next(error)
      }
    },

    async complete(req, res, next) {
      try {
        const file = await service.complete(parseAuthActor(req), String(req.params.id))
        res.status(200).json({
          id: file.id,
          key: file.key,
          mime: file.mime,
          size: file.size,
          status: file.status,
          originalName: file.originalName,
        })
      } catch (error) {
        next(error)
      }
    },

    async downloadUrl(req, res, next) {
      try {
        const result = await service.downloadUrl(parseAuthActor(req), String(req.params.id))
        res.status(200).json(result)
      } catch (error) {
        next(error)
      }
    },

    async softDelete(req, res, next) {
      try {
        await service.softDelete(parseAuthActor(req), String(req.params.id))
        res.status(204).send()
      } catch (error) {
        next(error)
      }
    },
  }
}
