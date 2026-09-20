import cors from 'cors'
import express from 'express'
import type { Pool } from 'pg'

import { loadConfig, type AppConfig } from './config/index.js'
import { errorHandler, notFoundHandler } from './errors/error.middleware.js'
import { requestContext } from './middleware/request-context.js'
import { createV1Router } from './routes/v1.js'

export type AppDeps = {
  config?: AppConfig
  pool?: Pool
}

export function createApp(deps: AppDeps = {}) {
  const config = deps.config ?? loadConfig()
  const app = express()

  if (config.trustProxy) {
    app.set('trust proxy', 1)
  }

  app.use(requestContext)
  app.use(
    cors({
      origin: config.corsOrigins,
      credentials: true,
    })
  )
  app.use(express.json())

  app.use('/api/v1', createV1Router({ pool: deps.pool, config }))

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
