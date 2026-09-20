import { loadConfig } from '../../config/index.js'
import { createDevicesController } from './devices.controller.js'
import { createDevicesRepository } from './devices.repository.js'
import { createDevicesRoutes } from './devices.routes.js'
import { createDevicesService } from './devices.service.js'
import type { DevicesService } from './devices.service.js'
import type { NotifyUserPayload } from './devices.types.js'

let devicesServiceSingleton: DevicesService | null = null

export function getDevicesService(): DevicesService {
  if (!devicesServiceSingleton) {
    const config = loadConfig()
    const repository = createDevicesRepository()
    devicesServiceSingleton = createDevicesService(repository, {
      expoAccessToken: config.expoAccessToken,
    })
  }
  return devicesServiceSingleton
}

export function createDevicesModule() {
  const service = getDevicesService()
  const controller = createDevicesController(service)
  return createDevicesRoutes(controller)
}

/** Public surface for other modules / jobs — best-effort push. */
export function notifyUser(userId: string, payload: NotifyUserPayload): Promise<void> {
  return getDevicesService().notifyUser(userId, payload)
}

export type { DevicesService, NotifyUserPayload }
