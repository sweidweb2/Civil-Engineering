import { Router } from 'express'
import type { Pool } from 'pg'

import { createCompositionRoot } from '../composition-root.js'
import type { AppConfig } from '../config/index.js'
import type { StorageService } from '../storage/index.js'

export type V1Deps = {
  pool?: Pool
  config?: AppConfig
  storage?: StorageService
}

/** Mount table only — service wiring lives in `composition-root.ts`. */
export function createV1Router(deps: V1Deps = {}): Router {
  const router = Router()
  const modules = createCompositionRoot(deps)

  router.use('/health', modules.health)
  router.use('/auth', modules.auth)
  router.use('/devices', modules.devices)
  router.use('/files', modules.files)
  router.use(modules.logging)
  router.use('/users', modules.users)
  router.use('/manager-profiles', modules.managerProfiles)
  router.use('/workers', modules.workers)
  router.use('/providers', modules.providers)
  router.use('/categories', modules.categories)
  router.use('/listings', modules.listings)
  router.use('/listing-images', modules.listingImages)
  router.use('/reviews', modules.reviews)
  router.use('/projects', modules.projects)
  router.use('/project-images', modules.projectImages)
  router.use('/design-requests', modules.designRequests)
  router.use('/notifications', modules.notifications)

  return router
}
