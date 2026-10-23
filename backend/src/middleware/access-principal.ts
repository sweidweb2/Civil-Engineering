import { createAuthRepository } from '../modules/auth/auth.repository.js'
import type { RoleName } from '../modules/auth/auth.schema.js'

export type AccessPrincipal = {
  id: string
  role: RoleName
  status: string
}

export type ResolveAccessPrincipal = (userId: string) => Promise<AccessPrincipal | null>

let resolver: ResolveAccessPrincipal | null = null

/** Override for tests; production wires the default DB resolver from createApp. */
export function setAccessPrincipalResolver(next: ResolveAccessPrincipal | null): void {
  resolver = next
}

export function getAccessPrincipalResolver(): ResolveAccessPrincipal {
  if (!resolver) {
    const repository = createAuthRepository()
    resolver = async (userId) => {
      const user = await repository.findById(userId)
      if (!user) return null
      return {
        id: user.id,
        role: user.role as RoleName,
        status: user.status,
      }
    }
  }
  return resolver
}
