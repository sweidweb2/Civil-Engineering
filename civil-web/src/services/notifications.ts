import { apiRequest } from './api'

export type NotificationType =
  | 'INFO'
  | 'SUCCESS'
  | 'WARNING'
  | 'ERROR'
  | 'ANNOUNCEMENT'
  | 'SYSTEM'

export type Notification = {
  id: string
  senderId: string | null
  receiverId: string
  type: NotificationType
  title: string
  message: string
  isRead: boolean
  readAt: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  sender?: {
    id: string
    email: string
    role: string
  } | null
}

export type PaginatedNotifications = {
  data: Notification[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
    counts: {
      active: number
      unread: number
      deleted: number
    }
  }
}

export type CreateNotificationInput = {
  receiverId: string
  type?: NotificationType
  title: string
  message: string
}

export type BroadcastNotificationInput = {
  receiverIds: string[]
  type?: NotificationType
  title: string
  message: string
}

export type UpdateNotificationInput = {
  title?: string
  message?: string
  type?: NotificationType
  isRead?: boolean
}

export function listNotifications(page = 1, limit = 20, includeDeleted = false, mine = false) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    includeDeleted: String(includeDeleted),
  })
  if (mine) params.set('mine', 'true')
  return apiRequest<PaginatedNotifications>(`/notifications?${params.toString()}`, { cache: 'no-store' })
}

export function getNotification(id: string) {
  return apiRequest<{ data: Notification }>(`/notifications/${id}`)
}

export function getUnreadCount() {
  return apiRequest<{ data: { count: number } }>('/notifications/unread-count', { cache: 'no-store' })
}

export function markAllAsRead() {
  return apiRequest<{ data: { count: number } }>('/notifications/read-all', { method: 'POST' })
}

export function createNotification(input: CreateNotificationInput) {
  return apiRequest<{ data: Notification }>('/notifications', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function broadcastNotification(input: BroadcastNotificationInput) {
  return apiRequest<{ data: { count: number } }>('/notifications/broadcast', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateNotification(id: string, input: UpdateNotificationInput) {
  return apiRequest<{ data: Notification }>(`/notifications/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function markAsRead(id: string) {
  return apiRequest<{ data: Notification }>(`/notifications/${id}/read`, {
    method: 'POST',
  })
}

export function markAsUnread(id: string) {
  return apiRequest<{ data: Notification }>(`/notifications/${id}/unread`, {
    method: 'POST',
  })
}

export function softDeleteNotification(id: string) {
  return apiRequest<{ data: Notification }>(`/notifications/${id}/soft`, {
    method: 'DELETE',
  })
}

export function hardDeleteNotification(id: string) {
  return apiRequest<void>(`/notifications/${id}/hard`, {
    method: 'DELETE',
  })
}

export function restoreNotification(id: string) {
  return apiRequest<{ data: Notification }>(`/notifications/${id}/restore`, {
    method: 'POST',
  })
}
