import { type Router as ExpressRouter, Router } from 'express'
import type { Pool } from 'pg'

import { type AppConfig, loadConfig } from './config/index.js'
import { createAuthModule } from './modules/auth/index.js'
import { createCategoriesModule } from './modules/categories/index.js'
import { createDevicesModule } from './modules/devices/index.js'
import { buildFilesService, createFilesModule } from './modules/files/index.js'
import { createHealthRoutes } from './modules/health/health.routes.js'
import { createHealthService } from './modules/health/health.service.js'
import { createListingImagesModule } from './modules/listing-images/index.js'
import { buildListingsService, createListingsModule } from './modules/listings/index.js'
import { createLoggingModule } from './modules/logging/index.js'
import { createNotificationsModule } from './modules/notifications/index.js'
import { createProjectImagesModule } from './modules/project-images/index.js'
import { createProjectStagesModule } from './modules/project-stages/index.js'
import { buildProjectsService, createProjectsModule } from './modules/projects/index.js'
import { buildProvidersService, createProvidersModule } from './modules/providers/index.js'
import { buildReviewsService, createReviewsModule } from './modules/reviews/index.js'
import { createManagerProfilesModule, createUsersModule } from './modules/users/index.js'
import { createWorkersModule } from './modules/workers/index.js'
import { getStorageService, type StorageService } from './storage/index.js'

export type CompositionRootDeps = {
  config?: AppConfig
  storage?: StorageService
  pool?: Pool
}

export type CompositionRoot = {
  health: ExpressRouter
  auth: ExpressRouter
  devices: ExpressRouter
  files: ExpressRouter
  logging: ExpressRouter
  users: ExpressRouter
  managerProfiles: ExpressRouter
  workers: ExpressRouter
  providers: ExpressRouter
  categories: ExpressRouter
  listings: ExpressRouter
  listingImages: ExpressRouter
  reviews: ExpressRouter
  projects: ExpressRouter
  projectImages: ExpressRouter
  notifications: ExpressRouter
}

/**
 * Composition root for the HTTP app: builds each cross-module service exactly once
 * (providers → listings → projects → files) and passes it explicitly to every
 * module that needs it. This replaces the "first caller's `getXService` deps win"
 * ordering that used to live in `routes/v1.ts`.
 *
 * Prefer `buildXService` + explicit deps on this path. Module `getXService()`
 * singletons remain only for standalone/test helpers — not for app wiring.
 */
export function createCompositionRoot(deps: CompositionRootDeps = {}): CompositionRoot {
  const config = deps.config ?? loadConfig()
  const storage = deps.storage ?? (config.storage ? getStorageService(config) : undefined)
  const moduleDeps = { config, storage }

  const providersService = buildProvidersService(moduleDeps)
  const listingsService = buildListingsService({ ...moduleDeps, providers: providersService })
  const projectsService = buildProjectsService(moduleDeps)
  const reviewsService = buildReviewsService({ ...moduleDeps, listingsService })
  const filesService = buildFilesService({ ...moduleDeps, projectsService })

  return {
    health: createHealthRoutes(createHealthService({ pool: deps.pool })),
    auth: createAuthModule(config),
    devices: createDevicesModule(),
    files: createFilesModule({ service: filesService }),
    logging: createLoggingModule(),
    users: createUsersModule({
      filesService,
      adminOverview: {
        providers: providersService,
        listings: listingsService,
        projects: projectsService,
        reviews: reviewsService,
      },
    }),
    managerProfiles: createManagerProfilesModule(),
    workers: createWorkersModule(moduleDeps),
    providers: createProvidersModule({ service: providersService }),
    categories: createCategoriesModule(),
    listings: createListingsModule({ service: listingsService }),
    listingImages: createListingImagesModule({ ...moduleDeps, listingsService }),
    reviews: createReviewsModule({ service: reviewsService }),
    projects: (() => {
      const projectsRouter = Router()
      projectsRouter.use(createProjectsModule({ service: projectsService }))
      projectsRouter.use(createProjectStagesModule({ projectsService }))
      return projectsRouter
    })(),
    projectImages: createProjectImagesModule({ ...moduleDeps, projectsService }),
    notifications: createNotificationsModule(),
  }
}
