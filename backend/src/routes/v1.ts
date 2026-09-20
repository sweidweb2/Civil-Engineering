import { Router } from 'express'
import type { Pool } from 'pg'

import { createHealthController } from '../modules/health/health.controller.js'
import { createHealthRepository } from '../modules/health/health.repository.js'
import { createHealthRoutes } from '../modules/health/health.routes.js'
import { createHealthService } from '../modules/health/health.service.js'

export type V1Deps = {
  pool?: Pool
}

export function createV1Router(deps: V1Deps = {}): Router {
  const router = Router()

  const healthRepository = createHealthRepository(deps.pool)
  const healthService = createHealthService(healthRepository)
  const healthController = createHealthController(healthService)

  router.use('/health', createHealthRoutes(healthController))

  return router
}
