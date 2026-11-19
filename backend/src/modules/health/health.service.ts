import type { Pool } from 'pg'

import { serviceUnavailable } from '../../errors/app-error.js'
import { ErrorCodes } from '../../errors/error-codes.js'
import type { HealthDbStatus, HealthStatus } from './health.types.js'

export type HealthService = {
  getHealth: () => HealthStatus
  getDbHealth: () => Promise<HealthDbStatus>
}

export type HealthServiceDeps = {
  pool?: Pool
  /** Test hook — overrides the pool ping. */
  ping?: () => Promise<boolean>
}

export function createHealthService(deps: HealthServiceDeps = {}): HealthService {
  return {
    getHealth() {
      return { ok: true }
    },

    async getDbHealth() {
      const ok = deps.ping ? await deps.ping() : await pingPool(deps.pool)
      if (!ok) {
        throw serviceUnavailable(ErrorCodes.DB_UNAVAILABLE, 'Database is unavailable')
      }
      return { ok: true, db: true }
    },
  }
}

async function pingPool(pool?: Pool): Promise<boolean> {
  if (!pool) {
    throw serviceUnavailable(ErrorCodes.DB_NOT_CONFIGURED, 'Database is not configured')
  }
  try {
    const result = await pool.query<{ ok: number }>('SELECT 1::int AS ok')
    return result.rows[0]?.ok === 1
  } catch {
    throw serviceUnavailable(ErrorCodes.DB_UNAVAILABLE, 'Database is unavailable')
  }
}
