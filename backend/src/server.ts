import 'dotenv/config'

import { createApp } from './app.js'
import { loadConfig } from './config/index.js'
import { closePool } from './database/pool.js'
import { startBackgroundJobs } from './jobs/index.js'
import { getLogger } from './logging/index.js'

const config = loadConfig()
const logger = getLogger()
const app = createApp({ config })

/** Vercel imports this as the Express function entry; do not listen there. */
export default app

if (!process.env.VERCEL) {
  startBackgroundJobs()
  const server = app.listen(config.port, () => {
    logger.info({ port: config.port }, 'API listening')
  })

  function shutdown(signal: string) {
    logger.info({ signal }, 'shutting down')
    server.close(() => {
      void closePool()
        .catch((err) => logger.error({ err }, 'failed to close postgres pool'))
        .finally(() => process.exit(0))
    })
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))

  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'unhandledRejection')
  })
  process.on('uncaughtException', (error) => {
    logger.error({ err: error }, 'uncaughtException')
    shutdown('uncaughtException')
  })
}
