import { Router } from 'express'
import type { Pool } from 'pg'

import type { AppConfig } from '../config/index.js'
import { loadConfig } from '../config/index.js'
import { createAuthModule } from '../modules/auth/index.js'
import { createCategoriesModule } from '../modules/categories/index.js'
import { createDevicesModule } from '../modules/devices/index.js'
import { createFilesModule } from '../modules/files/index.js'
import { createHealthController } from '../modules/health/health.controller.js'
import { createHealthRepository } from '../modules/health/health.repository.js'
import { createHealthRoutes } from '../modules/health/health.routes.js'
import { createHealthService } from '../modules/health/health.service.js'
import { createListingsModule } from '../modules/listings/index.js'
import { createLoggingModule } from '../modules/logging/index.js'
import { createNotificationsModule } from '../modules/notifications/index.js'
import { createProjectImagesModule } from '../modules/project-images/index.js'
import { createProjectsModule } from '../modules/projects/index.js'
import { createProvidersModule } from '../modules/providers/index.js'
import { createReviewsModule } from '../modules/reviews/index.js'
import { createUsersModule } from '../modules/users/index.js'
import type { StorageService } from '../storage/index.js'

export type V1Deps = {
  pool?: Pool
  config?: AppConfig
  storage?: StorageService
}

export function createV1Router(deps: V1Deps = {}): Router {
  const router = Router()
  const config = deps.config ?? loadConfig()

  const healthRepository = createHealthRepository(deps.pool)
  const healthService = createHealthService(healthRepository, config)
  const healthController = createHealthController(healthService)

  // Projects first so getProjectsService() singleton includes storage for list mainImageUrl
  const projectsRouter = createProjectsModule({ config, storage: deps.storage })

  router.use('/health', createHealthRoutes(healthController))
  router.use('/auth', createAuthModule(config))
  router.use('/devices', createDevicesModule())
  router.use('/files', createFilesModule({ config, storage: deps.storage }))
  router.use(createLoggingModule())
  router.use('/users', createUsersModule())
  router.use('/providers', createProvidersModule())
  router.use('/categories', createCategoriesModule())
  router.use('/listings', createListingsModule())
  router.use('/reviews', createReviewsModule())
  router.use('/projects', projectsRouter)
  router.use('/project-images', createProjectImagesModule({ config, storage: deps.storage }))
  router.use('/notifications', createNotificationsModule())
  // workers / materials / expenses modules stay in tree but are unmounted until implemented

  return router
}
