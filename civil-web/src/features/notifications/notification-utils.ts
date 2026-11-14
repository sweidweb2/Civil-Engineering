import { formatDistanceToNow } from 'date-fns'

import { toDateFnsLocale } from '@/lib/locale'
import type { AppLocale } from '@/stores/localeStore'

export function formatNotificationTime(iso: string, locale: AppLocale = 'en'): string {
  return formatDistanceToNow(new Date(iso), {
    addSuffix: true,
    locale: toDateFnsLocale(locale),
  })
}

export function portalNotificationsPath(pathname: string): string {
  if (pathname.startsWith('/super')) return '/super/notifications'
  if (pathname.startsWith('/pm')) return '/pm/notifications'
  if (pathname.startsWith('/provider')) return '/provider/listings'
  return '/admin/notifications'
}
