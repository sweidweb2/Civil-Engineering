import { formatDistanceToNow } from 'date-fns'

export function formatNotificationTime(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true })
}

export function portalNotificationsPath(pathname: string): string {
  if (pathname.startsWith('/super')) return '/super/notifications'
  if (pathname.startsWith('/pm')) return '/pm/notifications'
  if (pathname.startsWith('/provider')) return '/provider/notifications'
  return '/admin/notifications'
}
