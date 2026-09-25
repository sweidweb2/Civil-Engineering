import { formatDistanceToNow, isToday, isYesterday } from 'date-fns'
import { BadgeCheck, FolderKanban, Megaphone, Star, UserCheck, type LucideIcon } from 'lucide-react'

import type { AppNotification, NotificationKind } from './notifications.types'

export type NotificationGroupLabel = 'Today' | 'Yesterday' | 'Earlier'

export type NotificationGroup = {
  label: NotificationGroupLabel
  items: AppNotification[]
}

const KIND_ICON: Record<NotificationKind, LucideIcon> = {
  approval: UserCheck,
  verification: BadgeCheck,
  review: Star,
  project: FolderKanban,
  system: Megaphone,
}

export function notificationIcon(kind: NotificationKind): LucideIcon {
  return KIND_ICON[kind]
}

export function formatNotificationTime(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true })
}

export function notificationGroupLabel(iso: string): NotificationGroupLabel {
  const date = new Date(iso)
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return 'Earlier'
}

export function groupNotifications(items: AppNotification[]): NotificationGroup[] {
  const buckets: Record<NotificationGroupLabel, AppNotification[]> = {
    Today: [],
    Yesterday: [],
    Earlier: [],
  }

  for (const item of items) {
    buckets[notificationGroupLabel(item.createdAt)].push(item)
  }

  return (['Today', 'Yesterday', 'Earlier'] as const)
    .map((label) => ({ label, items: buckets[label] }))
    .filter((group) => group.items.length > 0)
}

export function portalNotificationsPath(pathname: string): string {
  if (pathname.startsWith('/super')) return '/super/notifications'
  if (pathname.startsWith('/pm')) return '/pm/notifications'
  if (pathname.startsWith('/provider')) return '/provider/notifications'
  return '/admin/notifications'
}

export function canFollowNotificationHref(pathname: string, href: string | null): boolean {
  if (!href) return false
  if (pathname.startsWith('/admin')) return href.startsWith('/admin/')
  if (pathname.startsWith('/super')) return href.startsWith('/super/')
  if (pathname.startsWith('/pm')) return href.startsWith('/pm/')
  if (pathname.startsWith('/provider')) return href.startsWith('/provider/')
  return false
}
