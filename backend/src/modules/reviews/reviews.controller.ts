import type { NextFunction, Request, Response } from 'express'

import { parseAuthActor } from '../../auth/auth-actor.js'
import type { ListReviewsQuery, ReviewTargetType } from './reviews.schema.js'
import type { ReviewsService } from './reviews.service.js'

export type ReviewsController = {
  list: (req: Request, res: Response, next: NextFunction) => Promise<void>
  listTargets: (req: Request, res: Response, next: NextFunction) => Promise<void>
  getById: (req: Request, res: Response, next: NextFunction) => Promise<void>
  create: (req: Request, res: Response, next: NextFunction) => Promise<void>
  update: (req: Request, res: Response, next: NextFunction) => Promise<void>
  remove: (req: Request, res: Response, next: NextFunction) => Promise<void>
}

export function createReviewsController(service: ReviewsService): ReviewsController {
  return {
    async list(req, res, next) {
      try {
        const result = await service.listReviews(req.query as unknown as ListReviewsQuery, parseAuthActor(req))
        res.status(200).json(result)
      } catch (error) {
        next(error)
      }
    },

    async listTargets(req, res, next) {
      try {
        const targetType = String(req.query.targetType) as ReviewTargetType
        const data = await service.listTargets(targetType, parseAuthActor(req))
        res.status(200).json({ data })
      } catch (error) {
        next(error)
      }
    },

    async getById(req, res, next) {
      try {
        const review = await service.getReviewById(String(req.params.id), parseAuthActor(req))
        res.status(200).json({ data: review })
      } catch (error) {
        next(error)
      }
    },

    async create(req, res, next) {
      try {
        const review = await service.createReview(req.body, parseAuthActor(req))
        res.status(201).json({ data: review })
      } catch (error) {
        next(error)
      }
    },

    async update(req, res, next) {
      try {
        const review = await service.updateReview(String(req.params.id), req.body, parseAuthActor(req))
        res.status(200).json({ data: review })
      } catch (error) {
        next(error)
      }
    },

    async remove(req, res, next) {
      try {
        await service.deleteReview(String(req.params.id), parseAuthActor(req))
        res.status(204).send()
      } catch (error) {
        next(error)
      }
    },
  }
}
