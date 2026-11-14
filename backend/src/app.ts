import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import type { Pool } from 'pg'

import { type AppConfig, loadConfig } from './config/index.js'
import { errorHandler, notFoundHandler } from './errors/error.middleware.js'
import { createApiRateLimiter } from './middleware/rate-limit.js'
import { requestContext } from './middleware/request-context.js'
import { createRequestLogger } from './middleware/request-logger.js'
import { requireTrustedOrigin } from './middleware/trusted-origin.js'
import { createV1Router } from './routes/v1.js'
import type { StorageService } from './storage/index.js'

export type AppDeps = {
  config?: AppConfig
  pool?: Pool
  storage?: StorageService
}

export function createApp(deps: AppDeps = {}) {
  const config = deps.config ?? loadConfig()
  const app = express()

  if (config.trustProxy) {
    app.set('trust proxy', 1)
  }

  app.use(requestContext)
  app.use(createRequestLogger())
  app.use(helmet())
  app.use(
    cors({
      origin: config.corsOrigins,
      credentials: true,
    }),
  )
  app.use(express.json({ limit: config.jsonBodyLimit }))
  app.use(createApiRateLimiter(config))

  app.use('/api/v1', requireTrustedOrigin(config.corsOrigins))
  app.use('/api/v1', createV1Router({ pool: deps.pool, config, storage: deps.storage }))

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
