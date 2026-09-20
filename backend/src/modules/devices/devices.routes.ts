import { Router } from 'express'

import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import type { DevicesController } from './devices.controller.js'
import { registerDeviceBodySchema, unregisterDeviceBodySchema } from './devices.schema.js'

export function createDevicesRoutes(controller: DevicesController): Router {
  const router = Router()

  router.use(authenticate)

  router.post('/', validate({ body: registerDeviceBodySchema }), controller.register)
  router.delete('/', validate({ body: unregisterDeviceBodySchema }), controller.unregister)

  return router
}
