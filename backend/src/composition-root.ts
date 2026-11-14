import type { Router } from 'express'
import type { Pool } from 'pg'

import { type AppConfig, loadConfig } from './config/index.js'
import { createAuthModule } from './modules/auth/index.js'
import { createCategoriesModule } from './modules/categories/index.js'
import { createDevicesModule } from './modules/devices/index.js'
import { buildFilesService, createFilesModule } from './modules/files/index.js'
import { createHealthController } from './modules/health/health.controller.js'
import { createHealthRepository } from './modules/health/health.repository.js'
import { createHealthRoutes } from './modules/health/health.routes.js'
import { createHealthService } from './modules/health/health.service.js'
import { createInputTypesModule } from './modules/input-types/index.js'
import { createListingImagesModule } from './modules/listing-images/index.js'
import { buildListingsService, createListingsModule } from './modules/listings/index.js'
import { createLoggingModule } from './modules/logging/index.js'
import { createNotificationsModule } from './modules/notifications/index.js'
import { createProjectImagesModule } from './modules/project-images/index.js'
import { buildProjectsService, createProjectsModule } from './modules/projects/index.js'
import { buildProvidersService, createProvidersModule } from './modules/providers/index.js'
import { createReviewsModule } from './modules/reviews/index.js'
import { createStepsModule, getStepsService } from './modules/steps/index.js'
import { createManagerProfilesModule, createUsersModule } from './modules/users/index.js'
import { getStorageService, type StorageService } from './storage/index.js'

export type CompositionRootDeps = {
  config?: AppConfig
  storage?: StorageService
  pool?: Pool
}

export type CompositionRoot = {
  health: Router
  auth: Router
  devices: Router
  files: Router
  logging: Router
  users: Router
  managerProfiles: Router
  providers: Router
  categories: Router
  listings: Router
  listingImages: Router
  reviews: Router
  inputTypes: Router
  steps: Router
  projects: Router
  projectImages: Router
  notifications: Router
}

/**
 * Composition root for the HTTP app: builds each cross-module service exactly once
 * (providers → listings → steps → projects → files) and passes it explicitly to every
 * module that needs it. This replaces the "first caller's `getXService` deps win"
 * ordering that used to live in `routes/v1.ts`.
 *
 * The `getXService()` singletons in each module remain only for standalone/test use;
 * nothing on this path reads them for modules that take deps (providers, listings,
 * projects, files). Dependency-free services (categories, input-types, steps, logging,
 * devices) still use their singletons, which cannot be shadowed by someone else's deps.
 */
export function createCompositionRoot(deps: CompositionRootDeps = {}): CompositionRoot {
  const config = deps.config ?? loadConfig()
  const storage = deps.storage ?? (config.storage ? getStorageService(config) : undefined)
  const moduleDeps = { config, storage }

  const providersService = buildProvidersService(moduleDeps)
  const listingsService = buildListingsService({ ...moduleDeps, providers: providersService })
  const projectsService = buildProjectsService({ ...moduleDeps, stepsService: getStepsService() })
  // Files depends on projects; project steppers depend on files (injected below).
  const filesService = buildFilesService({ ...moduleDeps, projectsService })

  const healthService = createHealthService(createHealthRepository(deps.pool))

  return {
    health: createHealthRoutes(createHealthController(healthService)),
    auth: createAuthModule(config),
    devices: createDevicesModule(),
    files: createFilesModule({ service: filesService }),
    logging: createLoggingModule(),
    users: createUsersModule({ filesService }),
    managerProfiles: createManagerProfilesModule(),
    providers: createProvidersModule({ service: providersService }),
    categories: createCategoriesModule(),
    listings: createListingsModule({ service: listingsService }),
    listingImages: createListingImagesModule({ ...moduleDeps, listingsService }),
    reviews: createReviewsModule({ listingsService }),
    inputTypes: createInputTypesModule(),
    steps: createStepsModule(),
    projects: createProjectsModule({
      service: projectsService,
      listings: listingsService,
      files: {
        requireReadyAttachment: (fileId, entityType, entityId) =>
          filesService.requireReadyAttachment(fileId, entityType, entityId),
        softDelete: (actor, fileId) => filesService.softDelete(actor, fileId),
      },
    }),
    projectImages: createProjectImagesModule({ ...moduleDeps, projectsService }),
    notifications: createNotificationsModule(),
  }
}
