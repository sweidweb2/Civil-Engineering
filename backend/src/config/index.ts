import { z } from 'zod'

const nodeEnvSchema = z.enum(['development', 'test', 'staging', 'production'])

const baseEnvSchema = z.object({
  NODE_ENV: nodeEnvSchema.default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  TRUST_PROXY: z.enum(['true', 'false']).optional(),
  DATABASE_URL: z.string().min(1).optional(),
  JWT_ACCESS_SECRET: z.string().min(32, 'must be at least 32 characters').optional(),
  JWT_REFRESH_SECRET: z.string().min(32, 'must be at least 32 characters').optional(),
  JWT_ACCESS_EXPIRES_IN: z.string().min(1).default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().min(1).default('7d'),
  JSON_BODY_LIMIT: z.string().min(1).default('100kb'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(200),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  EXPO_ACCESS_TOKEN: z.string().min(1).optional(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  STORAGE_PROVIDER: z.enum(['r2']).optional(),
  STORAGE_ENDPOINT: z.string().min(1).optional(),
  STORAGE_BUCKET: z.string().min(1).optional(),
  STORAGE_REGION: z.string().min(1).default('auto'),
  STORAGE_ACCESS_KEY: z.string().min(1).optional(),
  STORAGE_SECRET_KEY: z.string().min(1).optional(),
  STORAGE_PUBLIC_BASE_URL: z.string().min(1).optional(),
  STORAGE_UPLOAD_URL_TTL_SEC: z.coerce.number().int().positive().default(600),
  STORAGE_DOWNLOAD_URL_TTL_SEC: z.coerce.number().int().positive().default(600),
  STORAGE_MAX_BYTES: z.coerce.number().int().positive().default(25_000_000),
})

export type StorageConfig = {
  provider: 'r2'
  endpoint: string
  bucket: string
  region: string
  accessKey: string
  secretKey: string
  publicBaseUrl?: string
  uploadUrlTtlSec: number
  downloadUrlTtlSec: number
  maxBytes: number
}

export type AppConfig = {
  env: z.infer<typeof nodeEnvSchema>
  port: number
  corsOrigins: string[]
  trustProxy: boolean
  databaseUrl?: string
  jwtAccessSecret?: string
  jwtRefreshSecret?: string
  jwtAccessExpiresIn: string
  jwtRefreshExpiresIn: string
  jsonBodyLimit: string
  rateLimitWindowMs: number
  rateLimitMax: number
  authRateLimitWindowMs: number
  authRateLimitMax: number
  expoAccessToken?: string
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent'
  storage?: StorageConfig
  /** Max upload bytes even when storage credentials are not fully configured */
  storageMaxBytes: number
  storageUploadUrlTtlSec: number
  storageDownloadUrlTtlSec: number
}

function parseCorsOrigins(raw: string | undefined, env: AppConfig['env']): string[] {
  const fallback = 'http://localhost:5173,http://localhost:8081'

  if (env === 'production' || env === 'staging') {
    if (!raw || raw.trim().length === 0) {
      throw new Error('CORS_ORIGINS is required when NODE_ENV is staging or production')
    }
  }

  const value = (raw && raw.trim().length > 0 ? raw : fallback)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  if (value.length === 0) {
    throw new Error('CORS_ORIGINS must include at least one origin')
  }

  if (value.includes('*')) {
    throw new Error('CORS_ORIGINS must not use "*" (credentials-safe allowlist only)')
  }

  return value
}

function parseStorage(data: z.infer<typeof baseEnvSchema>): StorageConfig | undefined {
  const hasAny =
    data.STORAGE_PROVIDER ||
    data.STORAGE_ENDPOINT ||
    data.STORAGE_BUCKET ||
    data.STORAGE_ACCESS_KEY ||
    data.STORAGE_SECRET_KEY

  if (!hasAny) {
    return undefined
  }

  if (
    data.STORAGE_PROVIDER !== 'r2' ||
    !data.STORAGE_ENDPOINT ||
    !data.STORAGE_BUCKET ||
    !data.STORAGE_ACCESS_KEY ||
    !data.STORAGE_SECRET_KEY
  ) {
    throw new Error(
      'Storage config incomplete: require STORAGE_PROVIDER=r2, STORAGE_ENDPOINT, STORAGE_BUCKET, STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY',
    )
  }

  return {
    provider: 'r2',
    endpoint: data.STORAGE_ENDPOINT,
    bucket: data.STORAGE_BUCKET,
    region: data.STORAGE_REGION,
    accessKey: data.STORAGE_ACCESS_KEY,
    secretKey: data.STORAGE_SECRET_KEY,
    publicBaseUrl: data.STORAGE_PUBLIC_BASE_URL,
    uploadUrlTtlSec: data.STORAGE_UPLOAD_URL_TTL_SEC,
    downloadUrlTtlSec: data.STORAGE_DOWNLOAD_URL_TTL_SEC,
    maxBytes: data.STORAGE_MAX_BYTES,
  }
}

/** dotenv often sets optional keys to "" — treat those as unset. */
function omitEmptyEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const next: NodeJS.ProcessEnv = { ...env }
  for (const [key, value] of Object.entries(next)) {
    if (value === '') {
      delete next[key]
    }
  }
  return next
}

/**
 * Load and validate env once. Call from server entry / createApp — not from domain code.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = baseEnvSchema.safeParse(omitEmptyEnv(env))

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('; ')
    throw new Error(`Invalid configuration: ${details}`)
  }

  const data = parsed.data

  if (data.NODE_ENV === 'staging' || data.NODE_ENV === 'production') {
    if (!data.JWT_ACCESS_SECRET || !data.JWT_REFRESH_SECRET) {
      throw new Error(
        'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are required when NODE_ENV is staging or production (min 32 characters)',
      )
    }
  }

  // Behind Nginx in staging/production; explicit TRUST_PROXY wins when set.
  const trustProxy =
    data.TRUST_PROXY === 'true'
      ? true
      : data.TRUST_PROXY === 'false'
        ? false
        : data.NODE_ENV === 'staging' || data.NODE_ENV === 'production'

  return {
    env: data.NODE_ENV,
    port: data.PORT,
    corsOrigins: parseCorsOrigins(env.CORS_ORIGINS, data.NODE_ENV),
    trustProxy,
    databaseUrl: data.DATABASE_URL,
    jwtAccessSecret: data.JWT_ACCESS_SECRET,
    jwtRefreshSecret: data.JWT_REFRESH_SECRET,
    jwtAccessExpiresIn: data.JWT_ACCESS_EXPIRES_IN,
    jwtRefreshExpiresIn: data.JWT_REFRESH_EXPIRES_IN,
    jsonBodyLimit: data.JSON_BODY_LIMIT,
    rateLimitWindowMs: data.RATE_LIMIT_WINDOW_MS,
    rateLimitMax: data.RATE_LIMIT_MAX,
    authRateLimitWindowMs: data.AUTH_RATE_LIMIT_WINDOW_MS,
    authRateLimitMax: data.AUTH_RATE_LIMIT_MAX,
    expoAccessToken: data.EXPO_ACCESS_TOKEN,
    logLevel: data.LOG_LEVEL,
    storage: parseStorage(data),
    storageMaxBytes: data.STORAGE_MAX_BYTES,
    storageUploadUrlTtlSec: data.STORAGE_UPLOAD_URL_TTL_SEC,
    storageDownloadUrlTtlSec: data.STORAGE_DOWNLOAD_URL_TTL_SEC,
  }
}

export function requireJwtSecrets(config: AppConfig): {
  accessSecret: string
  refreshSecret: string
} {
  if (!config.jwtAccessSecret || !config.jwtRefreshSecret) {
    throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are required for authentication')
  }
  if (config.jwtAccessSecret.length < 32 || config.jwtRefreshSecret.length < 32) {
    throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be at least 32 characters')
  }
  return {
    accessSecret: config.jwtAccessSecret,
    refreshSecret: config.jwtRefreshSecret,
  }
}

export function requireStorageConfig(config: AppConfig): StorageConfig {
  if (!config.storage) {
    throw new Error('Storage is not configured (STORAGE_* env vars required)')
  }
  return config.storage
}
