import { createProvidersController } from './providers.controller.js'
import { createProvidersRepository } from './providers.repository.js'
import { createProvidersRoutes } from './providers.routes.js'
import { createProvidersService } from './providers.service.js'

export function createProvidersModule() {
  const repository = createProvidersRepository()
  const service = createProvidersService(repository)
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
