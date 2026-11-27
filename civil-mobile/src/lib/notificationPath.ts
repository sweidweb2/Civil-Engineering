/** In-app paths we allow push payloads to open (blocks `//`, `..`, exotic schemes). */
const NOTIFICATION_PATH_PREFIXES = [
  '/admin',
  '/pm',
  '/provider',
  '/worker',
  '/client',
  '/super',
  '/login',
  '/register',
  '/pending-approval',
  '/home',
] as const

/** True for a same-app absolute path that maps to a known portal/auth route. */
export function isAllowedNotificationPath(path: string): boolean {
  if (!path.startsWith('/') || path.startsWith('//')) return false
  if (path.includes('..') || path.includes('\\')) return false
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return false
  return NOTIFICATION_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  )
}
