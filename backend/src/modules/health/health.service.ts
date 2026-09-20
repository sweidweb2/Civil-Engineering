import type { AppConfig } from '../../config/index.js'
import { serviceUnavailable } from '../../errors/app-error.js'
import { ErrorCodes } from '../../errors/error-codes.js'
import { pingRedis } from '../../redis/index.js'
import type { HealthRepository } from './health.repository.js'
import type {
  HealthDbStatus,
  HealthRedisStatus,
  HealthStatus,
} from './health.types.js'

export type HealthService = {
  getHealth: () => HealthStatus
  getDbHealth: () => Promise<HealthDbStatus>
  getRedisHealth: () => Promise<HealthRedisStatus>
}

export function createHealthService(
  repository: HealthRepository,
  config: AppConfig,
): HealthService {
  return {
    getHealth() {
      return { ok: true }
    },

    async getDbHealth() {
      const ok = await repository.ping()
      if (!ok) {
        throw serviceUnavailable(ErrorCodes.DB_UNAVAILABLE, 'Database is unavailable')
      }
      return { ok: true, db: true }
    },

    async getRedisHealth() {
      if (!config.redisUrl) {
        throw serviceUnavailable(
          ErrorCodes.DB_UNAVAILABLE,
          'Redis is not configured (REDIS_URL)',
        )
      }
      const ok = await pingRedis(config)
      if (!ok) {
        throw serviceUnavailable(ErrorCodes.DB_UNAVAILABLE, 'Redis is unavailable')
      }
      return { ok: true, redis: true }
    },
  }
}
