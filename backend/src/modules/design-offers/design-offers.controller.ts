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
import type { ListDesignOffersQuery } from './design-offers.schema.js'
import type { DesignOffersService } from './design-offers.service.js'

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, os.tmpdir())
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '').slice(0, 16) || '.bin'
      cb(null, `civil-offer-${Date.now()}-${randomBytes(8).toString('hex')}${ext}`)
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
})

export type DesignOffersController = {
  imageUploadMiddleware: RequestHandler
  list: RequestHandler
  getById: RequestHandler
  create: RequestHandler
  update: RequestHandler
  uploadImage: (req: Request, res: Response, next: NextFunction) => Promise<void>
  remove: RequestHandler
}

export function createDesignOffersController(service: DesignOffersService): DesignOffersController {
  return {
    imageUploadMiddleware: upload.single('file'),

    list: wrap(async (req, res) => {
      const result = await service.list(
        req.query as unknown as ListDesignOffersQuery,
        parseAuthActor(req),
      )
      res.status(200).json(result)
    }),

    getById: wrap(async (req, res) => {
      const data = await service.getById(String(req.params.id), parseAuthActor(req))
      res.status(200).json({ data })
    }),

    create: wrap(async (req, res) => {
      const data = await service.create(req.body, parseAuthActor(req))
      res.status(201).json({ data })
    }),

    update: wrap(async (req, res) => {
      const data = await service.update(String(req.params.id), req.body, parseAuthActor(req))
      res.status(200).json({ data })
    }),

    async uploadImage(req, res, next) {
      try {
        if (!req.file) throw validationError('No file provided')
        const mimeParsed = allowedMimeSchema.safeParse(req.file.mimetype)
        if (!mimeParsed.success) throw validationError('File type is not allowed')
        const body = await readUploadBytes(req.file)
        const data = await service.uploadImage(String(req.params.id), parseAuthActor(req), {
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
