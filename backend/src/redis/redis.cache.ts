import { type AppConfig, loadConfig } from '../config/index.js'
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

/**
 * Return a cached JSON value, or load it and store it with a TTL.
 * A cache miss or Redis outage falls through to `load`.
 */
export async function readThroughCache<T>(
  key: string,
  ttlSeconds: number,
  load: () => Promise<T>,
): Promise<T> {
  const config = loadConfig()
  try {
    const hit = await cacheGetJson<T>(config, key)
    if (hit !== null) return hit
  } catch {
    return load()
  }

  const value = await load()
  try {
    await cacheSetJson(config, key, value, ttlSeconds)
  } catch {
    // The database value is still authoritative when Redis cannot store it.
  }
  return value
}

export async function invalidateCache(...keys: string[]): Promise<void> {
  try {
    await cacheDel(loadConfig(), ...keys)
  } catch {
    // Counts expire on their TTL when invalidation cannot reach Redis.
  }
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
