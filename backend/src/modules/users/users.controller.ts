import type { NextFunction, Request, Response } from 'express'

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
    async list(_req, res, next) {
      try {
        const data = await service.listUsers()
        res.status(200).json({ data })
      } catch (error) {
        next(error)
      }
    },
    async getById(req, res, next) {
      try {
        const user = await service.getUserById(String(req.params.id))
        res.status(200).json(user)
      } catch (error) {
        next(error)
      }
    },
    async create(req, res, next) {
      try {
        const user = await service.createUser(req.body)
        res.status(201).json(user)
      } catch (error) {
        next(error)
      }
    },
    async update(req, res, next) {
      try {
        const user = await service.updateUser(String(req.params.id), req.body)
        res.status(200).json(user)
      } catch (error) {
        next(error)
      }
    },
    async deactivate(req, res, next) {
      try {
        const user = await service.deactivateUser(String(req.params.id))
        res.status(200).json(user)
      } catch (error) {
        next(error)
      }
    },
  }
}
