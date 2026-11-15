import { Router } from 'express'

import type { AppConfig } from '../../config/index.js'
import { authenticate } from '../../middleware/authenticate.js'
import { createAuthRateLimiter, createRegisterRateLimiter } from '../../middleware/rate-limit.js'
import { validate } from '../../middleware/validate.js'
import type { AuthController } from './auth.controller.js'
import {
  changePasswordBodySchema,
  loginBodySchema,
  refreshBodySchema,
  registerBodySchema,
} from './auth.schema.js'

export function createAuthRoutes(controller: AuthController, config: AppConfig): Router {
  const router = Router()
  const authLimiter = createAuthRateLimiter(config)
  const registerLimiter = createRegisterRateLimiter(config)

  router.post(
    '/register',
    registerLimiter,
    validate({ body: registerBodySchema }),
    controller.register,
  )
  router.post('/login', authLimiter, validate({ body: loginBodySchema }), controller.login)
  router.post('/refresh', authLimiter, validate({ body: refreshBodySchema }), controller.refresh)
  router.post('/logout', authLimiter, validate({ body: refreshBodySchema }), controller.logout)
  router.post(
    '/change-password',
    authenticate,
    authLimiter,
    validate({ body: changePasswordBodySchema }),
    controller.changePassword,
  )

  return router
}
