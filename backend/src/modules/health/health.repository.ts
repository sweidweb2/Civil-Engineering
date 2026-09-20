import type { Pool } from 'pg'

import { ErrorCodes } from '../../errors/error-codes.js'
import { serviceUnavailable } from '../../errors/app-error.js'

export type HealthRepository = {
  ping: () => Promise<boolean>
}

export function createHealthRepository(pool?: Pool): HealthRepository {
  return {
    async ping() {
      if (!pool) {
        throw serviceUnavailable(
          ErrorCodes.DB_NOT_CONFIGURED,
          'Database is not configured'
        )
      }

      try {
        const result = await pool.query<{ ok: number }>('SELECT 1::int AS ok')
        return result.rows[0]?.ok === 1
      } catch {
        throw serviceUnavailable(
          ErrorCodes.DB_UNAVAILABLE,
          'Database is unavailable'
        )
      }
    },
  }
}
