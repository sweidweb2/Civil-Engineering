import { Router } from 'express'
import type { Pool } from 'pg'

import type { AppConfig } from '../config/index.js'
import { loadConfig } from '../config/index.js'
import { createAuthModule } from '../modules/auth/index.js'
import { createExpensesModule } from '../modules/expenses/index.js'
import { createHealthController } from '../modules/health/health.controller.js'
import { createHealthRepository } from '../modules/health/health.repository.js'
import { createHealthRoutes } from '../modules/health/health.routes.js'
import { createHealthService } from '../modules/health/health.service.js'
import { createLoggingModule } from '../modules/logging/index.js'
import { createMaterialsModule } from '../modules/materials/index.js'
import { createProjectsModule } from '../modules/projects/index.js'
import { createUsersModule } from '../modules/users/index.js'
import { createWorkersModule } from '../modules/workers/index.js'

export type V1Deps = {
  pool?: Pool
  config?: AppConfig
}

export function createV1Router(deps: V1Deps = {}): Router {
  const router = Router()
  const config = deps.config ?? loadConfig()

  const healthRepository = createHealthRepository(deps.pool)
  const healthService = createHealthService(healthRepository)
  const healthController = createHealthController(healthService)

  router.use('/health', createHealthRoutes(healthController))
  router.use('/auth', createAuthModule(config))
  router.use(createLoggingModule())
  router.use('/users', createUsersModule())
  router.use('/projects', createProjectsModule())
  router.use('/workers', createWorkersModule())
  router.use('/materials', createMaterialsModule())
  router.use('/expenses', createExpensesModule())

  return router
}
