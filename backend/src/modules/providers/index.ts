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

export function createProvidersModule(deps: ProvidersModuleDeps = {}) {
  const config = deps.config ?? loadConfig()
  const storage =
    deps.storage ?? (config.storage ? getStorageService(config) : undefined)
  const repository = createProvidersRepository()
  const service = createProvidersService(repository, { config, storage })
  const controller = createProvidersController(service)
  return createProvidersRoutes(controller)
}

export {
  findProviderIdByOwnerUserId,
  findProviderOwnerUserId,
} from './providers.access.js'
export { providersDomain } from './providers.domain.js'
export { createProvidersService }
export type { ProvidersService } from './providers.service.js'
