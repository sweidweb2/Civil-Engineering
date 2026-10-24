import type { NextFunction, Request, RequestHandler, Response } from 'express'
import multer from 'multer'

import { parseAuthActor } from '../../auth/auth-actor.js'
import { validationError } from '../../errors/app-error.js'
import { allowedMimeSchema, type UploadFileFields } from './files.schema.js'
import type { FilesService } from './files.service.js'

/** Matches STORAGE_MAX_BYTES default (25 MB). */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
})

function toFileResponse(file: {
  id: string
  key: string
  mime: string
  size: number | null
  status: string
  originalName: string
}) {
  return {
    id: file.id,
    key: file.key,
    mime: file.mime,
    size: file.size,
    status: file.status,
    originalName: file.originalName,
  }
}

export type FilesController = {
  uploadMiddleware: RequestHandler
  upload: (req: Request, res: Response, next: NextFunction) => Promise<void>
  presign: (req: Request, res: Response, next: NextFunction) => Promise<void>
  complete: (req: Request, res: Response, next: NextFunction) => Promise<void>
  downloadUrl: (req: Request, res: Response, next: NextFunction) => Promise<void>
  softDelete: (req: Request, res: Response, next: NextFunction) => Promise<void>
}

export function createFilesController(service: FilesService): FilesController {
  return {
    uploadMiddleware: upload.single('file'),

    async upload(req, res, next) {
      try {
        if (!req.file) {
          throw validationError('No file provided')
        }
        const mimeParsed = allowedMimeSchema.safeParse(req.file.mimetype)
        if (!mimeParsed.success) {
          throw validationError('File type is not allowed')
        }
        const fields = req.body as UploadFileFields
        const file = await service.uploadBytes(parseAuthActor(req), {
          entityType: fields.entityType,
          entityId: fields.entityId,
          mime: mimeParsed.data,
          originalName: req.file.originalname || 'upload',
          body: req.file.buffer,
        })
        res.status(201).json(toFileResponse(file))
      } catch (error) {
        next(error)
      }
    },

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
        res.status(200).json(toFileResponse(file))
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
