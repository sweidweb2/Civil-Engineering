import type { AppConfig } from '../../config/index.js'
import { loadConfig } from '../../config/index.js'
import { getLoggingService } from '../logging/index.js'
import { createAuthController } from './auth.controller.js'
import { createAuthRepository } from './auth.repository.js'
import { createAuthRoutes } from './auth.routes.js'
import { createAuthService } from './auth.service.js'

export function createAuthModule(config: AppConfig = loadConfig()) {
  const repository = createAuthRepository()
  const service = createAuthService(repository, config, getLoggingService())
  const controller = createAuthController(service, config)
  return createAuthRoutes(controller, config)
}

export {
  clearAccessPrincipalCache,
  createDbAccessPrincipalResolver,
  invalidateAccessPrincipal,
  type AccessPrincipal,
  type ResolveAccessPrincipal,
} from './access-principal.js'
export { hashPassword, verifyPassword } from './auth.tokens.js'
export { passwordSchema } from './password.schema.js'
export type { RoleName } from './auth.schema.js'
