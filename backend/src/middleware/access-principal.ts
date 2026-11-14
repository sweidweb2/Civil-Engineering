import { createAuthRepository } from '../modules/auth/auth.repository.js'
import type { RoleName } from '../modules/auth/auth.schema.js'

export type AccessPrincipal = {
  id: string
  role: RoleName
  status: string
}

export type ResolveAccessPrincipal = (userId: string) => Promise<AccessPrincipal | null>

/** Production resolver: loads role/status from the DB so changes apply before access TTL. */
export function createDbAccessPrincipalResolver(): ResolveAccessPrincipal {
  const repository = createAuthRepository()
  return async (userId) => {
    const user = await repository.findById(userId)
    if (!user) return null
    return {
      id: user.id,
      role: user.role as RoleName,
      status: user.status,
    }
  }
}
