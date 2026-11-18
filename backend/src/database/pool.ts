import { Pool, type PoolConfig } from 'pg'

import { getLogger } from '../logging/index.js'

/**
 * Shared Postgres pool for Prisma + health checks.
 * Cap well under Supabase session pooler limits (often 15) so parallel
 * dashboard requests cannot open unbounded clients.
 */
const globalForPool = globalThis as typeof globalThis & {
  pgPool?: Pool
}

function resolvePoolMax(): number {
  const raw = process.env.DB_POOL_MAX
  if (raw) {
    const parsed = Number.parseInt(raw, 10)
    if (Number.isFinite(parsed) && parsed > 0) return Math.min(parsed, 15)
  }
  // Vercel / serverless: stay tiny. Local/dev: small shared pool.
  return process.env.VERCEL ? 1 : 5
}

export function getPool(): Pool {
  if (globalForPool.pgPool) return globalForPool.pgPool

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to open a Postgres pool')
  }

  const max = resolvePoolMax()
  /** Cap individual SQL statements so lock waits cannot hold pool slots forever. */
  const statementTimeoutMs = 60_000
  const config: PoolConfig = {
    connectionString,
    max,
    // Return idle clients so Supabase session slots free up under load / HMR.
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 15_000,
    allowExitOnIdle: true,
  }

  const pool = new Pool(config)
  pool.on('connect', (client) => {
    client.query(`SET statement_timeout TO ${statementTimeoutMs}`).catch((err) => {
      getLogger().error({ err }, 'failed to set postgres statement_timeout')
    })
  })
  pool.on('error', (err) => {
    getLogger().error({ err }, 'pg pool idle client error')
  })

  getLogger().info(
    { max, statementTimeoutMs, vercel: Boolean(process.env.VERCEL) },
    'postgres pool ready',
  )

  globalForPool.pgPool = pool
  return pool
}

export async function closePool(): Promise<void> {
  const pool = globalForPool.pgPool
  if (!pool) return
  globalForPool.pgPool = undefined
  await pool.end()
}
