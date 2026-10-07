import { useAuthStore } from '@/stores/authStore'

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

function accessToken() {
  return useAuthStore.getState().tokens?.accessToken ?? null
}

export function listNotifications(page = 1, limit = 20, includeDeleted = false) {
  return apiRequest<PaginatedNotifications>(
    `/notifications?page=${page}&limit=${limit}&includeDeleted=${includeDeleted}`,
    {
      accessToken: accessToken(),
    }
  )
}

export function getNotification(id: string) {
  return apiRequest<{ data: Notification }>(`/notifications/${id}`, {
    accessToken: accessToken(),
  })
}

export function getUnreadCount() {
  return apiRequest<{ data: { count: number } }>('/notifications/unread-count', {
    accessToken: accessToken(),
  })
}

export function createNotification(input: CreateNotificationInput) {
  return apiRequest<{ data: Notification }>('/notifications', {
    method: 'POST',
    body: JSON.stringify(input),
    accessToken: accessToken(),
  })
}

export function broadcastNotification(input: BroadcastNotificationInput) {
  return apiRequest<{ data: { count: number } }>('/notifications/broadcast', {
    method: 'POST',
    body: JSON.stringify(input),
    accessToken: accessToken(),
  })
}

export function updateNotification(id: string, input: UpdateNotificationInput) {
  return apiRequest<{ data: Notification }>(`/notifications/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
    accessToken: accessToken(),
  })
}

export function markAsRead(id: string) {
  return apiRequest<{ data: Notification }>(`/notifications/${id}/read`, {
    method: 'POST',
    accessToken: accessToken(),
  })
}

export function markAsUnread(id: string) {
  return apiRequest<{ data: Notification }>(`/notifications/${id}/unread`, {
    method: 'POST',
    accessToken: accessToken(),
  })
}

export function softDeleteNotification(id: string) {
  return apiRequest<{ data: Notification }>(`/notifications/${id}/soft`, {
    method: 'DELETE',
    accessToken: accessToken(),
  })
}

export function hardDeleteNotification(id: string) {
  return apiRequest<void>(`/notifications/${id}/hard`, {
    method: 'DELETE',
    accessToken: accessToken(),
  })
}

export function restoreNotification(id: string) {
  return apiRequest<{ data: Notification }>(`/notifications/${id}/restore`, {
    method: 'POST',
    accessToken: accessToken(),
  })
}
