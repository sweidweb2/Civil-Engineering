import type { AppConfig } from '../../config/index.js'
import { loadConfig } from '../../config/index.js'
import { getStorageService, type StorageService } from '../../storage/index.js'
import { createProvidersController } from './providers.controller.js'
import { createProvidersRepository } from './providers.repository.js'
import { createProvidersRoutes } from './providers.routes.js'
import { createProvidersService, type ProvidersService } from './providers.service.js'

export type ProvidersModuleDeps = {
  config?: AppConfig
  storage?: StorageService
}

let providersServiceSingleton: ProvidersService | null = null

/** Builds a fresh service. The composition root calls this once per app. */
export function buildProvidersService(deps: ProvidersModuleDeps = {}): ProvidersService {
  const config = deps.config ?? loadConfig()
  const storage = deps.storage ?? (config.storage ? getStorageService(config) : undefined)
  return createProvidersService(createProvidersRepository(), { config, storage })
}

/** Standalone/test singleton (first caller's deps win). The app uses `composition-root.ts`. */
export function getProvidersService(deps: ProvidersModuleDeps = {}): ProvidersService {
  providersServiceSingleton ??= buildProvidersService(deps)
  return providersServiceSingleton
}

export function createProvidersModule(
  deps: ProvidersModuleDeps & { service?: ProvidersService } = {},
) {
  const service = deps.service ?? getProvidersService(deps)
  const controller = createProvidersController(service)
  return createProvidersRoutes(controller)
}

export { createProvidersService }
export type { ProvidersService } from './providers.service.js'
