import type { RequestHandler } from 'express'

import { parseAuthActor } from '../../auth/auth-actor.js'
import { wrap } from '../../errors/async-handler.js'
import type { ListListingsQuery } from './listings.schema.js'
import type { ListingsService } from './listings.service.js'

export type ListingsController = {
  list: RequestHandler
  getById: RequestHandler
  create: RequestHandler
  update: RequestHandler
  remove: RequestHandler
}

export function createListingsController(service: ListingsService): ListingsController {
  return {
    list: wrap(async (req, res) => {
      const result = await service.listListings(
        req.query as unknown as ListListingsQuery,
        parseAuthActor(req),
      )
      res.status(200).json(result)
    }),

    getById: wrap(async (req, res) => {
      const listing = await service.getListingById(String(req.params.id), parseAuthActor(req))
      res.status(200).json({ data: listing })
    }),

    create: wrap(async (req, res) => {
      const listing = await service.createListing(req.body, parseAuthActor(req))
      res.status(201).json({ data: listing })
    }),

    update: wrap(async (req, res) => {
      const listing = await service.updateListing(
        String(req.params.id),
        req.body,
        parseAuthActor(req),
      )
      res.status(200).json({ data: listing })
    }),

    remove: wrap(async (req, res) => {
      const result = await service.deleteListing(String(req.params.id), parseAuthActor(req))
      res.status(200).json({ data: result })
    }),
  }
}
