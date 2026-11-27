import { type Router as ExpressRouter, Router } from 'express'
import type { Pool } from 'pg'

import { type AppConfig, loadConfig } from './config/index.js'
import { createAuthModule } from './modules/auth/index.js'
import { createCategoriesModule, getCategoriesService } from './modules/categories/index.js'
import { createDesignOffersModule, getDesignOffersService } from './modules/design-offers/index.js'
import { createDesignRequestsModule } from './modules/design-requests/index.js'
import { createDevicesModule } from './modules/devices/index.js'
import { buildFilesService, createFilesModule } from './modules/files/index.js'
import { createHealthRoutes } from './modules/health/health.routes.js'
import { createHealthService } from './modules/health/health.service.js'
import { createListingImagesModule } from './modules/listing-images/index.js'
import { buildListingsService, createListingsModule } from './modules/listings/index.js'
import { createLoggingModule } from './modules/logging/index.js'
import { createNotificationsModule } from './modules/notifications/index.js'
import { createProjectImagesModule } from './modules/project-images/index.js'
import { createProjectProductivityModule } from './modules/project-productivity/index.js'
import { createProjectStagesModule } from './modules/project-stages/index.js'
import {
  buildProjectTasksService,
  createProjectTasksModule,
  createWorkerProjectTasksModule,
} from './modules/project-tasks/index.js'
import {
  buildProjectWorkersService,
  createProjectWorkersModule,
  createWorkerProjectsModule,
} from './modules/project-workers/index.js'
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
  designOffers: ExpressRouter
  designRequests: ExpressRouter
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
  const projectWorkersService = buildProjectWorkersService(projectsService)
  const projectTasksService = buildProjectTasksService(projectsService)
  const reviewsService = buildReviewsService({ ...moduleDeps, listingsService })
  const filesService = buildFilesService({ ...moduleDeps, projectsService })

  return {
    health: createHealthRoutes(createHealthService({ pool: deps.pool })),
    auth: createAuthModule(config),
    devices: createDevicesModule(),
    files: createFilesModule({ service: filesService }),
    logging: createLoggingModule(),
    users: createUsersModule({
      ...moduleDeps,
      filesService,
      adminOverview: {
        providers: providersService,
        listings: listingsService,
        projects: projectsService,
        reviews: reviewsService,
      },
    }),
    managerProfiles: createManagerProfilesModule(),
    workers: (() => {
      const workersRouter = Router()
      workersRouter.use(createWorkersModule(moduleDeps))
      workersRouter.use(
        createWorkerProjectsModule({ projectsService, service: projectWorkersService }),
      )
      workersRouter.use(
        createWorkerProjectTasksModule({ projectsService, service: projectTasksService }),
      )
      return workersRouter
    })(),
    providers: createProvidersModule({ service: providersService }),
    categories: createCategoriesModule({
      ...moduleDeps,
      filesService,
      service: getCategoriesService({ ...moduleDeps, filesService }),
    }),
    listings: createListingsModule({ service: listingsService }),
    listingImages: createListingImagesModule({ ...moduleDeps, listingsService }),
    reviews: createReviewsModule({ service: reviewsService }),
    projects: (() => {
      const projectsRouter = Router()
      projectsRouter.use(createProjectsModule({ service: projectsService }))
      projectsRouter.use(createProjectStagesModule({ projectsService }))
      projectsRouter.use(createProjectProductivityModule({ projectsService }))
      projectsRouter.use(
        createProjectWorkersModule({ projectsService, service: projectWorkersService }),
      )
      projectsRouter.use(
        createProjectTasksModule({ projectsService, service: projectTasksService }),
      )
      return projectsRouter
    })(),
    projectImages: createProjectImagesModule({ ...moduleDeps, projectsService }),
    designOffers: createDesignOffersModule({
      ...moduleDeps,
      filesService,
      service: getDesignOffersService({ ...moduleDeps, filesService }),
    }),
    designRequests: createDesignRequestsModule({
      ...moduleDeps,
      filesService,
      designOffers: getDesignOffersService({ ...moduleDeps, filesService }),
    }),
    notifications: createNotificationsModule(),
  }
}
