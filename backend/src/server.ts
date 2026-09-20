import 'dotenv/config'

import { createApp } from './app.js'
import { loadConfig } from './config/index.js'

const config = loadConfig()
const app = createApp({ config })

const server = app.listen(config.port, () => {
  console.info(`API listening on http://localhost:${config.port}`)
})

function shutdown(signal: string) {
  console.info(`${signal} received, shutting down`)
  server.close(() => {
    process.exit(0)
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
