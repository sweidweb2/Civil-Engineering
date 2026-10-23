import { createNotificationsController } from './notifications.controller.js'
import { createNotificationsRepository } from './notifications.repository.js'
import { createNotificationsRouter } from './notifications.routes.js'
import { createNotificationsService } from './notifications.service.js'

export function createNotificationsModule() {
  const repository = createNotificationsRepository()
  const service = createNotificationsService({ repository })
  const controller = createNotificationsController({ service })
  return createNotificationsRouter({ controller })
}

export * from './notifications.controller.js'
export * from './notifications.repository.js'
export * from './notifications.routes.js'
export * from './notifications.schema.js'
export * from './notifications.service.js'
export * from './notifications.types.js'
