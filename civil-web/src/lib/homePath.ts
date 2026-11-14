import type { AuthRole } from '@/services/auth'

/** Post-login / guest-redirect home by role. */
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
    default:
      return '/'
  }
}

/** Portal prefix from the current path (`/admin`, `/super`, …). */
export function portalBaseFromPath(pathname: string): string {
  if (pathname.startsWith('/super')) return '/super'
  if (pathname.startsWith('/pm')) return '/pm'
  if (pathname.startsWith('/provider')) return '/provider'
  if (pathname.startsWith('/admin')) return '/admin'
  return '/admin'
}
