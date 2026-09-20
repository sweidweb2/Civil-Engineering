import { Redis } from 'ioredis'

import type { AppConfig } from '../config/index.js'
import { getLogger } from '../logging/index.js'

let client: Redis | null = null

/**
 * Shared Redis client for the API process.
 * Returns null when REDIS_URL is unset (cache helpers become no-ops).
 */
export function getRedis(config: AppConfig): Redis | null {
  if (!config.redisUrl) {
    return null
  }

  if (!client) {
    const redis = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      lazyConnect: false,
    })

    redis.on('error', (err) => {
      getLogger().error({ err: err.message }, 'redis connection error')
    })

    client = redis
  }

  return client
}

export async function pingRedis(config: AppConfig): Promise<boolean> {
  const redis = getRedis(config)
  if (!redis) {
    return false
  }

  try {
    const result = await redis.ping()
    return result === 'PONG'
  } catch {
    return false
  }
}

export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit()
    client = null
  }
}
