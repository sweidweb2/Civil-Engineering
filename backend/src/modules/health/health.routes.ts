import { Router } from 'express'

import { wrap } from '../../errors/async-handler.js'
import type { HealthService } from './health.service.js'

export function createHealthRoutes(service: HealthService): Router {
  const router = Router()

  router.get('/', (_req, res) => {
    res.status(200).json(service.getHealth())
  })

  router.get(
    '/db',
    wrap(async (_req, res) => {
      res.status(200).json(await service.getDbHealth())
    }),
  )

  return router
}
