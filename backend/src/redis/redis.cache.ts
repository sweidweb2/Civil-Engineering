import type { AppConfig } from '../config/index.js'
import { getRedis } from './redis.client.js'

const DEFAULT_TTL_SECONDS = 120

/**
 * JSON cache helpers. No-op when Redis is not configured.
 * Always set TTL — never leave orphan keys without expiry.
 */
export async function cacheGetJson<T>(
  config: AppConfig,
  key: string,
): Promise<T | null> {
  const redis = getRedis(config)
  if (!redis) return null

  const raw = await redis.get(key)
  if (raw == null) return null

  try {
    return JSON.parse(raw) as T
  } catch {
    await redis.del(key)
    return null
  }
}

export async function cacheSetJson(
  config: AppConfig,
  key: string,
  value: unknown,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<void> {
  const redis = getRedis(config)
  if (!redis) return

  await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds)
}

export async function cacheDel(
  config: AppConfig,
  ...keys: string[]
): Promise<void> {
  const redis = getRedis(config)
  if (!redis || keys.length === 0) return
  await redis.del(...keys)
}

/** Bump a list version counter used in versioned list keys. */
export async function bumpListVersion(
  config: AppConfig,
  versionKey: string,
): Promise<number> {
  const redis = getRedis(config)
  if (!redis) return 0
  return redis.incr(versionKey)
}

export async function getListVersion(
  config: AppConfig,
  versionKey: string,
): Promise<number> {
  const redis = getRedis(config)
  if (!redis) return 0
  const raw = await redis.get(versionKey)
  const n = raw ? Number.parseInt(raw, 10) : 0
  return Number.isFinite(n) ? n : 0
}
