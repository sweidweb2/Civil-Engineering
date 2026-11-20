import { createLoggingController } from './logging.controller.js'
import { createLoggingRoutes } from './logging.routes.js'
import { getLoggingService } from './logging.singleton.js'

export function createLoggingModule() {
  const service = getLoggingService()
  const controller = createLoggingController(service)
  return createLoggingRoutes(controller)
}

export type { LoggingService } from './logging.service.js'
export { auditActivity, setAuditActivitySinkForTests } from './audit.js'
export { createLoggingRepository } from './logging.repository.js'
export { createLoggingService } from './logging.service.js'
export { getLoggingService, resetLoggingServiceForTests } from './logging.singleton.js'
