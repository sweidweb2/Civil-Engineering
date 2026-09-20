import type { RoleName } from '../modules/auth/auth.schema.js'

/** Elevated platform / tenant admins. SUPER inherits admin privileges. */
export const ADMIN_ROLES: readonly RoleName[] = ['SUPER', 'ADMIN'] as const

/** Ops / staff roles (UI + coarse route gates). Not a permission matrix. */
export const STAFF_ROLES: readonly RoleName[] = [
  'SUPER',
  'ADMIN',
  'MANAGER',
  'PROVIDER',
] as const

export function hasAnyRole(
  roles: readonly string[] | undefined,
  allowed: readonly RoleName[],
): boolean {
  if (!roles?.length || allowed.length === 0) return false
  return allowed.some((role) => roles.includes(role))
}

export function isAdmin(roles: readonly string[] | undefined): boolean {
  return hasAnyRole(roles, ADMIN_ROLES)
}

export function isSuper(roles: readonly string[] | undefined): boolean {
  return hasAnyRole(roles, ['SUPER'])
}

export function isStaff(roles: readonly string[] | undefined): boolean {
  return hasAnyRole(roles, STAFF_ROLES)
}
