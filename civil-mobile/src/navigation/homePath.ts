import type { AuthRole } from '@/services/auth'

import type { PortalId } from './portalNav'

/** Post-login home by role — mirrors civil-web `homePathForRole`. */
export function homePathForRole(role: AuthRole | null | undefined): string {
  switch (role) {
    case 'SUPER':
      return '/super'
    case 'ADMIN':
      return '/admin'
    case 'MANAGER':
      return '/pm/projects'
    case 'PROVIDER':
      return '/provider/listings'
    case 'WORKER':
      return '/worker'
    case 'CLIENT':
    default:
      return '/client'
  }
}

export function portalIdForRole(role: AuthRole | null | undefined): PortalId {
  switch (role) {
    case 'SUPER':
      return 'super'
    case 'ADMIN':
      return 'admin'
    case 'MANAGER':
      return 'pm'
    case 'PROVIDER':
      return 'provider'
    case 'WORKER':
      return 'worker'
    default:
      return 'client'
  }
}

/** True when pathname belongs to the portal for this role. */
export function isPathInRolePortal(pathname: string, role: AuthRole | null | undefined): boolean {
  const portal = portalIdForRole(role)
  return pathname === `/${portal}` || pathname.startsWith(`/${portal}/`)
}
