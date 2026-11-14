import 'dotenv/config'

import { createApp } from './app.js'
import { loadConfig } from './config/index.js'
import { getLogger } from './logging/index.js'

const config = loadConfig()
const logger = getLogger()
const app = createApp({ config })

const server = app.listen(config.port, () => {
  logger.info({ port: config.port }, 'API listening')
})

function shutdown(signal: string) {
  logger.info({ signal }, 'shutting down')
  server.close(() => {
    process.exit(0)
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
