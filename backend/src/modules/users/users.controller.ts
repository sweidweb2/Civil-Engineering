import type { NextFunction, Request, RequestHandler, Response } from 'express'
import multer from 'multer'

import { parseAuthActor } from '../../auth/auth-actor.js'
import { validationError } from '../../errors/app-error.js'
import type { ListApprovalsQuery, ListLookupQuery, ListUsersQuery, ListVerificationsQuery } from './users.schema.js'
import type { UsersService } from './users.service.js'

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
})

export type UsersController = {
  list: (req: Request, res: Response, next: NextFunction) => Promise<void>
  listLookup: (req: Request, res: Response, next: NextFunction) => Promise<void>
  getById: (req: Request, res: Response, next: NextFunction) => Promise<void>
  create: (req: Request, res: Response, next: NextFunction) => Promise<void>
  update: (req: Request, res: Response, next: NextFunction) => Promise<void>
  deactivate: (req: Request, res: Response, next: NextFunction) => Promise<void>
  listApprovals: (req: Request, res: Response, next: NextFunction) => Promise<void>
  createApproval: (req: Request, res: Response, next: NextFunction) => Promise<void>
  approve: (req: Request, res: Response, next: NextFunction) => Promise<void>
  unapprove: (req: Request, res: Response, next: NextFunction) => Promise<void>
  deleteApproval: (req: Request, res: Response, next: NextFunction) => Promise<void>
  listVerifications: (req: Request, res: Response, next: NextFunction) => Promise<void>
  createVerification: (req: Request, res: Response, next: NextFunction) => Promise<void>
  setVerification: (req: Request, res: Response, next: NextFunction) => Promise<void>
  deleteVerification: (req: Request, res: Response, next: NextFunction) => Promise<void>
  setAvatar: (req: Request, res: Response, next: NextFunction) => Promise<void>
  uploadAvatar: (req: Request, res: Response, next: NextFunction) => Promise<void>
  uploadAvatarMiddleware: RequestHandler
  clearAvatar: (req: Request, res: Response, next: NextFunction) => Promise<void>
  getAvatarUrl: (req: Request, res: Response, next: NextFunction) => Promise<void>
}

export function createUsersController(service: UsersService): UsersController {
  return {
    uploadAvatarMiddleware: avatarUpload.single('image'),

    async list(req, res, next) {
      try {
        const query = req.query as unknown as ListUsersQuery
        const result = await service.listUsers(query)
        res.status(200).json(result)
      } catch (error) {
        next(error)
      }
    },
    async listLookup(req, res, next) {
      try {
        const query = req.query as unknown as ListLookupQuery
        const result = await service.listLookup(query)
        res.status(200).json(result)
      } catch (error) {
        next(error)
      }
    },
    async getById(req, res, next) {
      try {
        const actor = parseAuthActor(req)
        const user = await service.assertAccessible(String(req.params.id), actor)
        res.status(200).json({ data: user })
      } catch (error) {
        next(error)
      }
    },
    async create(req, res, next) {
      try {
        const user = await service.createUser(req.body, parseAuthActor(req))
        res.status(201).json({ data: user })
      } catch (error) {
        next(error)
      }
    },
    async update(req, res, next) {
      try {
        const actor = parseAuthActor(req)
        const user = await service.updateUser(String(req.params.id), req.body, actor)
        res.status(200).json({ data: user })
      } catch (error) {
        next(error)
      }
    },
    async deactivate(req, res, next) {
      try {
        const actor = parseAuthActor(req)
        const user = await service.deactivateUser(String(req.params.id), actor)
        res.status(200).json({ data: user })
      } catch (error) {
        next(error)
      }
    },
    async listApprovals(req, res, next) {
      try {
        const query = req.query as unknown as ListApprovalsQuery
        const result = await service.listApprovals(query)
        res.status(200).json(result)
      } catch (error) {
        next(error)
      }
    },
    async createApproval(req, res, next) {
      try {
        const actor = parseAuthActor(req)
        const user = await service.createApproval(req.body, actor)
        res.status(201).json({ data: user })
      } catch (error) {
        next(error)
      }
    },
    async approve(req, res, next) {
      try {
        const actor = parseAuthActor(req)
        const user = await service.approveUser(String(req.params.id), actor)
        res.status(200).json({ data: user })
      } catch (error) {
        next(error)
      }
    },
    async unapprove(req, res, next) {
      try {
        const actor = parseAuthActor(req)
        const user = await service.unapproveUser(String(req.params.id), actor)
        res.status(200).json({ data: user })
      } catch (error) {
        next(error)
      }
    },
    async deleteApproval(req, res, next) {
      try {
        const actor = parseAuthActor(req)
        await service.deleteApproval(String(req.params.id), actor)
        res.status(204).send()
      } catch (error) {
        next(error)
      }
    },
    async listVerifications(req, res, next) {
      try {
        const query = req.query as unknown as ListVerificationsQuery
        const result = await service.listVerifications(query)
        res.status(200).json(result)
      } catch (error) {
        next(error)
      }
    },
    async createVerification(req, res, next) {
      try {
        const actor = parseAuthActor(req)
        const user = await service.createVerification(req.body, actor)
        res.status(201).json({ data: user })
      } catch (error) {
        next(error)
      }
    },
    async setVerification(req, res, next) {
      try {
        const actor = parseAuthActor(req)
        const user = await service.setVerification(String(req.params.id), req.body, actor)
        res.status(200).json({ data: user })
      } catch (error) {
        next(error)
      }
    },
    async deleteVerification(req, res, next) {
      try {
        const actor = parseAuthActor(req)
        await service.deleteVerification(String(req.params.id), actor)
        res.status(204).send()
      } catch (error) {
        next(error)
      }
    },
    async setAvatar(req, res, next) {
      try {
        const actor = parseAuthActor(req)
        const result = await service.setAvatar(String(req.params.id), req.body, actor)
        res.status(200).json({
          data: result.user,
          meta: { avatarDownloadUrl: result.avatarDownloadUrl },
        })
      } catch (error) {
        next(error)
      }
    },
    async uploadAvatar(req, res, next) {
      try {
        if (!req.file) {
          throw validationError('No image file provided')
        }
        const actor = parseAuthActor(req)
        const result = await service.uploadAvatar(String(req.params.id), req.file, actor)
        res.status(201).json({
          data: result.user,
          meta: { avatarDownloadUrl: result.avatarDownloadUrl },
        })
      } catch (error) {
        next(error)
      }
    },
    async clearAvatar(req, res, next) {
      try {
        const actor = parseAuthActor(req)
        const result = await service.clearAvatar(String(req.params.id), actor)
        res.status(200).json({
          data: result.user,
          meta: { avatarDownloadUrl: result.avatarDownloadUrl },
        })
      } catch (error) {
        next(error)
      }
    },
    async getAvatarUrl(req, res, next) {
      try {
        const actor = parseAuthActor(req)
        const result = await service.getAvatarUrl(String(req.params.id), actor)
        res.status(200).json({
          data: { avatarDownloadUrl: result.avatarDownloadUrl },
        })
      } catch (error) {
        next(error)
      }
    },
  }
}
