import type { RequestHandler } from 'express'

import { parseAuthActor } from '../../auth/auth-actor.js'
import { wrap } from '../../errors/async-handler.js'
import type { ListReviewsQuery, ReviewTargetType } from './reviews.schema.js'
import type { ReviewsService } from './reviews.service.js'

export type ReviewsController = {
  list: RequestHandler
  listTargets: RequestHandler
  getById: RequestHandler
  create: RequestHandler
  update: RequestHandler
  remove: RequestHandler
}

export function createReviewsController(service: ReviewsService): ReviewsController {
  return {
    list: wrap(async (req, res) => {
      const result = await service.listReviews(req.query as unknown as ListReviewsQuery, parseAuthActor(req))
      res.status(200).json(result)
    }),

    listTargets: wrap(async (req, res) => {
      const targetType = String(req.query.targetType) as ReviewTargetType
      const data = await service.listTargets(targetType, parseAuthActor(req))
      res.status(200).json({ data })
    }),

    getById: wrap(async (req, res) => {
      const review = await service.getReviewById(String(req.params.id), parseAuthActor(req))
      res.status(200).json({ data: review })
    }),

    create: wrap(async (req, res) => {
      const review = await service.createReview(req.body, parseAuthActor(req))
      res.status(201).json({ data: review })
    }),

    update: wrap(async (req, res) => {
      const review = await service.updateReview(String(req.params.id), req.body, parseAuthActor(req))
      res.status(200).json({ data: review })
    }),

    remove: wrap(async (req, res) => {
      await service.deleteReview(String(req.params.id), parseAuthActor(req))
      res.status(204).send()
    }),
  }
}
