import { logPerf } from '../../logging/perf.js'
import { createAuthRepository } from './auth.repository.js'
import type { RoleName } from './auth.schema.js'

export type AccessPrincipal = {
  id: string
  role: RoleName
  status: string
}

export type ResolveAccessPrincipal = (userId: string) => Promise<AccessPrincipal | null>

/** Short TTL so demotions apply quickly without a DB round-trip on every request. */
const PRINCIPAL_CACHE_TTL_MS = 3_000

type CacheEntry = {
  principal: AccessPrincipal | null
  expiresAt: number
}

/** Process-wide principal cache (one Map for all resolver instances). */
const principalCache = new Map<string, CacheEntry>()

/** Drop a cached principal so the next request reloads role/status from the DB. */
export function invalidateAccessPrincipal(userId: string): void {
  principalCache.delete(userId)
}

/** Test helper — clears the shared cache. */
export function clearAccessPrincipalCache(): void {
  principalCache.clear()
}

/**
 * Loads role/status from the DB so demotions apply before access TTL.
 * Uses a lean select + short in-process cache (per instance; fine without Redis).
 * Lives in the auth module so domain services never import HTTP middleware.
 */
export function createDbAccessPrincipalResolver(
  options: { cacheTtlMs?: number } = {},
): ResolveAccessPrincipal {
  const repository = createAuthRepository()
  const cacheTtlMs = options.cacheTtlMs ?? PRINCIPAL_CACHE_TTL_MS

  return async (userId) => {
    const now = Date.now()
    const hit = principalCache.get(userId)
    if (hit && hit.expiresAt > now) {
      logPerf('auth', 'principal cache hit', { userId, cache: 'hit', ms: 0 })
      return hit.principal
    }

    const started = performance.now()
    const user = await repository.findPrincipalById(userId)
    const ms = Math.round(performance.now() - started)
    const principal: AccessPrincipal | null = user
      ? {
          id: user.id,
          role: user.role as RoleName,
          status: user.status,
        }
      : null

    principalCache.set(userId, { principal, expiresAt: now + cacheTtlMs })
    logPerf('auth', `principal cache miss ${ms}ms`, { userId, cache: 'miss', ms })
    return principal
  }
}
