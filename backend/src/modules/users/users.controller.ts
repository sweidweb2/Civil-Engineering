import type { NextFunction, Request, Response } from 'express'

import type { ListUsersQuery } from './users.schema.js'
import type { UsersService } from './users.service.js'

export type UsersController = {
  list: (req: Request, res: Response, next: NextFunction) => Promise<void>
  getById: (req: Request, res: Response, next: NextFunction) => Promise<void>
  create: (req: Request, res: Response, next: NextFunction) => Promise<void>
  update: (req: Request, res: Response, next: NextFunction) => Promise<void>
  deactivate: (req: Request, res: Response, next: NextFunction) => Promise<void>
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
        const user = await service.getUserById(String(req.params.id))
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
        const user = await service.updateUser(String(req.params.id), req.body)
        res.status(200).json({ data: user })
      } catch (error) {
        next(error)
      }
    },
    async deactivate(req, res, next) {
      try {
        const user = await service.deactivateUser(String(req.params.id))
        res.status(200).json({ data: user })
      } catch (error) {
        next(error)
      }
    },
  }
}
