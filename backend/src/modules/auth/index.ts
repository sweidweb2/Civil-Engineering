import { createAuthController } from './auth.controller.js'
import { createAuthRepository } from './auth.repository.js'
import { createAuthRoutes } from './auth.routes.js'
import { createAuthService } from './auth.service.js'

export function createAuthModule() {
  const repository = createAuthRepository()
  const service = createAuthService(repository)
  const controller = createAuthController(service)
  return createAuthRoutes(controller)
}

export { authDomain } from './auth.domain.js'
