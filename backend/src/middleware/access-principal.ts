import { createAuthRepository } from '../modules/auth/auth.repository.js'
import type { RoleName } from '../modules/auth/auth.schema.js'

export type AccessPrincipal = {
  id: string
  role: RoleName
  status: string
}

export type ResolveAccessPrincipal = (userId: string) => Promise<AccessPrincipal | null>

/** Short TTL so demotions apply quickly without a DB round-trip on every request. */
const PRINCIPAL_CACHE_TTL_MS = 10_000

type CacheEntry = {
  principal: AccessPrincipal | null
  expiresAt: number
}

/**
 * Production resolver: loads role/status from the DB so changes apply before access TTL.
 * Uses a lean select + short in-process cache (per instance; fine without Redis).
 */
export function createDbAccessPrincipalResolver(
  options: { cacheTtlMs?: number } = {},
): ResolveAccessPrincipal {
  const repository = createAuthRepository()
  const cacheTtlMs = options.cacheTtlMs ?? PRINCIPAL_CACHE_TTL_MS
  const cache = new Map<string, CacheEntry>()

  return async (userId) => {
    const now = Date.now()
    const hit = cache.get(userId)
    if (hit && hit.expiresAt > now) {
      return hit.principal
    }

    const user = await repository.findPrincipalById(userId)
    const principal: AccessPrincipal | null = user
      ? {
          id: user.id,
          role: user.role as RoleName,
          status: user.status,
        }
      : null

    cache.set(userId, { principal, expiresAt: now + cacheTtlMs })
    return principal
  }
}
