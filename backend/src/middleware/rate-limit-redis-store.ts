import type { Store } from 'express-rate-limit'
import { type Redis } from 'ioredis'

import { cacheKeys } from '../redis/redis.keys.js'

/**
 * Minimal Redis-backed hit counter for express-rate-limit (multi-instance safe).
 */
export function createRedisRateLimitStore(
  redis: Redis,
  scope: string,
  windowMs: number,
): Store {
  const prefix = (key: string) => cacheKeys.rateLimit(scope, key)

  return {
    localKeys: false,

    async increment(key) {
      const redisKey = prefix(key)
      const totalHits = await redis.incr(redisKey)
      if (totalHits === 1) {
        await redis.pexpire(redisKey, windowMs)
      }
      const ttl = await redis.pttl(redisKey)
      const resetTime = new Date(Date.now() + (ttl > 0 ? ttl : windowMs))
      return { totalHits, resetTime }
    },

    async decrement(key) {
      const redisKey = prefix(key)
      const value = await redis.decr(redisKey)
      if (value < 0) {
        await redis.set(redisKey, '0', 'PX', windowMs)
      }
    },

    async resetKey(key) {
      await redis.del(prefix(key))
    },
  }
}
