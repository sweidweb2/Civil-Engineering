import pino, { type Logger } from 'pino'

import { loadConfig } from '../config/index.js'

const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  'password',
  'refreshToken',
  'accessToken',
  'token',
  'STORAGE_SECRET_KEY',
  'STORAGE_ACCESS_KEY',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'CLOUDFLARE_API_TOKEN',
  '*.password',
  '*.refreshToken',
  '*.accessToken',
  '*.token',
]

let rootLogger: Logger | null = null

/**
 * Pretty (human) logs in local/dev terminals. Production/staging stay JSON for aggregators.
 * Override: LOG_PRETTY=true|false
 */
function shouldUsePrettyLogs(env: string): boolean {
  const override = process.env.LOG_PRETTY
  if (override === 'true') return true
  if (override === 'false') return false
  if (env === 'production' || env === 'staging') return false
  if (env === 'test') return false
  return true
}

/**
 * Shared Pino logger — pretty multi-line in development, JSON in production.
 * Never log secrets (see redact paths).
 */
export function getLogger(): Logger {
  if (!rootLogger) {
    const config = loadConfig()
    const pretty = shouldUsePrettyLogs(config.env)

    rootLogger = pino({
      level: config.logLevel,
      base: { service: 'civil-api' },
      redact: {
        paths: REDACT_PATHS,
        remove: true,
      },
      ...(pretty
        ? {
            transport: {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'HH:MM:ss.l',
                ignore: 'pid,hostname,service',
                singleLine: false,
                messageFormat: '{msg}',
                errorLikeObjectKeys: ['err', 'error'],
              },
            },
          }
        : {}),
    })
  }
  return rootLogger
}

export function createChildLogger(bindings: Record<string, unknown>): Logger {
  return getLogger().child(bindings)
}

/** Test helper — reset singleton between suites if needed. */
export function resetLoggerForTests(): void {
  rootLogger = null
}
