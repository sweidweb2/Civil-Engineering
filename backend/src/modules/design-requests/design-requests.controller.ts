import { randomBytes } from 'node:crypto'
import os from 'node:os'
import path from 'node:path'
import type { NextFunction, Request, RequestHandler, Response } from 'express'
import multer from 'multer'

import { parseAuthActor } from '../../auth/auth-actor.js'
import { validationError } from '../../errors/app-error.js'
import { wrap } from '../../errors/async-handler.js'
import { allowedMimeSchema } from '../files/files.schema.js'
import { readUploadBytes } from '../files/image-policy.js'
import {
  createDesignRequestBodySchema,
  createDesignRequestFieldsSchema,
  type ListDesignRequestsQuery,
} from './design-requests.schema.js'
import type { DesignRequestsService } from './design-requests.service.js'

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, os.tmpdir())
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '').slice(0, 16) || '.bin'
      cb(null, `civil-design-${Date.now()}-${randomBytes(8).toString('hex')}${ext}`)
    },
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
})

export type DesignRequestsController = {
  optionalUploadMiddleware: RequestHandler
  responseUploadMiddleware: RequestHandler
  getDesignerContact: RequestHandler
  list: RequestHandler
  getById: RequestHandler
  create: (req: Request, res: Response, next: NextFunction) => Promise<void>
  updateStatus: RequestHandler
  uploadRequirementFile: (req: Request, res: Response, next: NextFunction) => Promise<void>
  uploadResponseFile: (req: Request, res: Response, next: NextFunction) => Promise<void>
  remove: RequestHandler
}

export function createDesignRequestsController(
  service: DesignRequestsService,
): DesignRequestsController {
  return {
    optionalUploadMiddleware: (req, res, next) => {
      if (req.is('multipart/form-data')) {
        return upload.single('file')(req, res, next)
      }
      next()
    },

    responseUploadMiddleware: upload.single('file'),

    getDesignerContact: wrap(async (req, res) => {
      const contact = await service.getDesignerContact(parseAuthActor(req))
      res.status(200).json({ data: contact })
    }),

    list: wrap(async (req, res) => {
      const result = await service.list(
        req.query as unknown as ListDesignRequestsQuery,
        parseAuthActor(req),
      )
      res.status(200).json(result)
    }),

    getById: wrap(async (req, res) => {
      const data = await service.getById(String(req.params.id), parseAuthActor(req))
      res.status(200).json({ data })
    }),

    async create(req, res, next) {
      try {
        const actor = parseAuthActor(req)
        const rawBody = req.body ?? {}
        const parsed = req.file
          ? createDesignRequestFieldsSchema.parse(rawBody)
          : createDesignRequestBodySchema.parse(rawBody)

        let file:
          | { mime: ReturnType<typeof allowedMimeSchema.parse>; originalName: string; body: Buffer }
          | undefined
        if (req.file) {
          const mimeParsed = allowedMimeSchema.safeParse(req.file.mimetype)
          if (!mimeParsed.success) {
            throw validationError('File type is not allowed')
          }
          file = {
            mime: mimeParsed.data,
            originalName: req.file.originalname || 'upload',
            body: await readUploadBytes(req.file),
          }
        }

        const data = await service.create(parsed, actor, file)
        res.status(201).json({ data })
      } catch (error) {
        next(error)
      }
    },

    updateStatus: wrap(async (req, res) => {
      const data = await service.updateStatus(String(req.params.id), req.body, parseAuthActor(req))
      res.status(200).json({ data })
    }),

    async uploadRequirementFile(req, res, next) {
      try {
        if (!req.file) {
          throw validationError('No file provided')
        }
        const mimeParsed = allowedMimeSchema.safeParse(req.file.mimetype)
        if (!mimeParsed.success) {
          throw validationError('File type is not allowed')
        }
        const body = await readUploadBytes(req.file)
        const data = await service.uploadRequirementFile(
          String(req.params.id),
          parseAuthActor(req),
          {
            mime: mimeParsed.data,
            originalName: req.file.originalname || 'upload',
            body,
          },
        )
        res.status(200).json({ data })
      } catch (error) {
        next(error)
      }
    },

    async uploadResponseFile(req, res, next) {
      try {
        if (!req.file) {
          throw validationError('No file provided')
        }
        const mimeParsed = allowedMimeSchema.safeParse(req.file.mimetype)
        if (!mimeParsed.success) {
          throw validationError('File type is not allowed')
        }
        const body = await readUploadBytes(req.file)
        const data = await service.uploadResponseFile(String(req.params.id), parseAuthActor(req), {
          mime: mimeParsed.data,
          originalName: req.file.originalname || 'upload',
          body,
        })
        res.status(200).json({ data })
      } catch (error) {
        next(error)
      }
    },

    remove: wrap(async (req, res) => {
      await service.remove(String(req.params.id), parseAuthActor(req))
      res.status(204).send()
    }),
  }
}
