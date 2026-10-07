import type { NextFunction, Request, Response } from 'express'

import { unauthorized } from '../../errors/app-error.js'
import type { ListUsersQuery } from './users.schema.js'
import type { UsersService } from './users.service.js'

export type UsersController = {
  list: (req: Request, res: Response, next: NextFunction) => Promise<void>
  getById: (req: Request, res: Response, next: NextFunction) => Promise<void>
  create: (req: Request, res: Response, next: NextFunction) => Promise<void>
  update: (req: Request, res: Response, next: NextFunction) => Promise<void>
  deactivate: (req: Request, res: Response, next: NextFunction) => Promise<void>
}

function requireActor(req: Request) {
  if (!req.user) {
    throw unauthorized()
  }
  return { id: req.user.id, roles: req.user.roles }
}

export function createUsersController(service: UsersService): UsersController {
  return {
    async list(req, res, next) {
      try {
        const query = req.query as ListUsersQuery
        const result = await service.listUsers(query)
        res.status(200).json(result)
      } catch (error) {
        next(error)
      }
    },
    async getById(req, res, next) {
      try {
        const actor = requireActor(req)
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
        const actor = requireActor(req)
        const user = await service.updateUser(String(req.params.id), req.body, actor)
        res.status(200).json({ data: user })
      } catch (error) {
        next(error)
      }
    },
    async deactivate(req, res, next) {
      try {
        const actor = requireActor(req)
        const user = await service.deactivateUser(String(req.params.id), actor)
        res.status(200).json({ data: user })
      } catch (error) {
        next(error)
      }
    },
  }
}
