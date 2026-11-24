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
import type { ListCategoriesQuery } from './categories.schema.js'
import type { CategoriesService } from './categories.service.js'

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, os.tmpdir())
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '').slice(0, 16) || '.bin'
      cb(null, `civil-category-${Date.now()}-${randomBytes(8).toString('hex')}${ext}`)
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
})

export type CategoriesController = {
  imageUploadMiddleware: RequestHandler
  list: RequestHandler
  getById: RequestHandler
  create: RequestHandler
  update: RequestHandler
  uploadImage: (req: Request, res: Response, next: NextFunction) => Promise<void>
  remove: RequestHandler
}

export function createCategoriesController(service: CategoriesService): CategoriesController {
  return {
    imageUploadMiddleware: upload.single('file'),

    list: wrap(async (req, res) => {
      const result = await service.listCategories(
        req.query as unknown as ListCategoriesQuery,
        parseAuthActor(req),
      )
      res.status(200).json(result)
    }),

    getById: wrap(async (req, res) => {
      const category = await service.getCategoryById(String(req.params.id), parseAuthActor(req))
      res.status(200).json({ data: category })
    }),

    create: wrap(async (req, res) => {
      const category = await service.createCategory(req.body, parseAuthActor(req))
      res.status(201).json({ data: category })
    }),

    update: wrap(async (req, res) => {
      const category = await service.updateCategory(
        String(req.params.id),
        req.body,
        parseAuthActor(req),
      )
      res.status(200).json({ data: category })
    }),

    async uploadImage(req, res, next) {
      try {
        if (!req.file) throw validationError('No file provided')
        const mimeParsed = allowedMimeSchema.safeParse(req.file.mimetype)
        if (!mimeParsed.success) throw validationError('File type is not allowed')
        const body = await readUploadBytes(req.file)
        const category = await service.uploadImage(String(req.params.id), parseAuthActor(req), {
          mime: mimeParsed.data,
          originalName: req.file.originalname || 'upload',
          body,
        })
        res.status(200).json({ data: category })
      } catch (error) {
        next(error)
      }
    },

    remove: wrap(async (req, res) => {
      await service.deleteCategory(String(req.params.id), parseAuthActor(req))
      res.status(204).send()
    }),
  }
}
