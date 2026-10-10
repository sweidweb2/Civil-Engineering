import type { NextFunction, Request, Response } from 'express'

import { parseAuthActor } from '../../auth/auth-actor.js'
import type { ListListingsQuery } from './listings.schema.js'
import type { ListingsService } from './listings.service.js'

export type ListingsController = {
  list: (req: Request, res: Response, next: NextFunction) => Promise<void>
  getById: (req: Request, res: Response, next: NextFunction) => Promise<void>
  create: (req: Request, res: Response, next: NextFunction) => Promise<void>
  update: (req: Request, res: Response, next: NextFunction) => Promise<void>
  remove: (req: Request, res: Response, next: NextFunction) => Promise<void>
}

export function createListingsController(service: ListingsService): ListingsController {
  return {
    async list(req, res, next) {
      try {
        const result = await service.listListings(req.query as unknown as ListListingsQuery, parseAuthActor(req))
        res.status(200).json(result)
      } catch (error) {
        next(error)
      }
    },

    async getById(req, res, next) {
      try {
        const listing = await service.getListingById(String(req.params.id), parseAuthActor(req))
        res.status(200).json({ data: listing })
      } catch (error) {
        next(error)
      }
    },

    async create(req, res, next) {
      try {
        const listing = await service.createListing(req.body, parseAuthActor(req))
        res.status(201).json({ data: listing })
      } catch (error) {
        next(error)
      }
    },

    async update(req, res, next) {
      try {
        const listing = await service.updateListing(String(req.params.id), req.body, parseAuthActor(req))
        res.status(200).json({ data: listing })
      } catch (error) {
        next(error)
      }
    },

    async remove(req, res, next) {
      try {
        const result = await service.deleteListing(String(req.params.id), parseAuthActor(req))
        res.status(200).json({ data: result })
      } catch (error) {
        next(error)
      }
    },
  }
}
