import { Router } from 'express'

import { validate } from '../../middleware/validate.js'
import type { AuthController } from './auth.controller.js'
import {
  loginBodySchema,
  refreshBodySchema,
  registerBodySchema,
} from './auth.schema.js'

export function createAuthRoutes(controller: AuthController): Router {
  const router = Router()

  router.post('/register', validate({ body: registerBodySchema }), controller.register)
  router.post('/login', validate({ body: loginBodySchema }), controller.login)
  router.post('/refresh', validate({ body: refreshBodySchema }), controller.refresh)
  router.post('/logout', validate({ body: refreshBodySchema }), controller.logout)

  return router
}
