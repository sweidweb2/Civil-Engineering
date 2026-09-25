import { create } from 'zustand'

import { MOCK_NOTIFICATIONS } from './mock-data'
import type { AppNotification } from './notifications.types'

type NotificationsState = {
  items: AppNotification[]
  markRead: (id: string) => void
  markUnread: (id: string) => void
  markAllRead: () => void
}

/** Client inbox flags only — mock rows, not server cache. */
export const useNotificationsStore = create<NotificationsState>((set) => ({
  items: MOCK_NOTIFICATIONS,
  markRead: (id) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id && !item.readAt ? { ...item, readAt: new Date().toISOString() } : item,
      ),
    })),
  markUnread: (id) =>
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? { ...item, readAt: null } : item)),
    })),
  markAllRead: () =>
    set((state) => {
      const now = new Date().toISOString()
      return {
        items: state.items.map((item) => (item.readAt ? item : { ...item, readAt: now })),
      }
    }),
}))

export function sortNotifications(items: AppNotification[]): AppNotification[] {
  return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function unreadCount(items: AppNotification[]): number {
  return items.filter((item) => !item.readAt).length
}
