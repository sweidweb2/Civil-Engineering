import type { NextFunction, Request, Response } from 'express'

import { parseAuthActor } from '../../auth/auth-actor.js'
import type { ListApprovalsQuery, ListUsersQuery, ListVerificationsQuery } from './users.schema.js'
import type { UsersService } from './users.service.js'

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
}

export function createUsersController(service: UsersService): UsersController {
  return {
    async list(req, res, next) {
      try {
        const query = req.query as unknown as ListUsersQuery
        const result = await service.listUsers(query)
        res.status(200).json(result)
      } catch (error) {
        next(error)
      }
    },
    async listLookup(_req, res, next) {
      try {
        const result = await service.listLookup()
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
        const user = await service.createUser(req.body)
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
  }
}
