import { z } from 'zod'

const nodeEnvSchema = z.enum(['development', 'test', 'staging', 'production'])

const baseEnvSchema = z.object({
  NODE_ENV: nodeEnvSchema.default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  TRUST_PROXY: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  DATABASE_URL: z.string().min(1).optional(),
  // Reserved for auth foundation (optional until JWT is wired)
  JWT_ACCESS_SECRET: z.string().min(1).optional(),
  JWT_REFRESH_SECRET: z.string().min(1).optional(),
})

export type AppConfig = {
  env: z.infer<typeof nodeEnvSchema>
  port: number
  corsOrigins: string[]
  trustProxy: boolean
  databaseUrl?: string
  jwtAccessSecret?: string
  jwtRefreshSecret?: string
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

/**
 * Load and validate env once. Call from server entry / createApp — not from domain code.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = baseEnvSchema.safeParse(env)

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('; ')
    throw new Error(`Invalid configuration: ${details}`)
  }

  const data = parsed.data

  return {
    env: data.NODE_ENV,
    port: data.PORT,
    corsOrigins: parseCorsOrigins(env.CORS_ORIGINS, data.NODE_ENV),
    trustProxy: data.TRUST_PROXY,
    databaseUrl: data.DATABASE_URL,
    jwtAccessSecret: data.JWT_ACCESS_SECRET,
    jwtRefreshSecret: data.JWT_REFRESH_SECRET,
  }
}
