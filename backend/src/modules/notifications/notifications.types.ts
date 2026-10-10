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
}

export type NotificationWithSender = Notification & {
  sender: {
    id: string
    email: string
    role: string
  } | null
}

export type CreateNotificationData = {
  senderId?: string | null
  receiverId: string
  type?: NotificationType
  title: string
  message: string
}

export type UpdateNotificationData = {
  title?: string
  message?: string
  type?: NotificationType
  isRead?: boolean
}

export type NotificationsRepository = {
  findMany: (query: {
    receiverId?: string
    includeDeleted?: boolean
    page?: number
    limit?: number
  }) => Promise<{ notifications: NotificationWithSender[]; total: number }>
  countStates: (receiverId?: string) => Promise<{ active: number; unread: number; deleted: number }>
  findById: (id: string) => Promise<Notification | null>
  countUnread: (receiverId: string) => Promise<number>
  markAllRead: (receiverId: string) => Promise<number>
  create: (data: CreateNotificationData) => Promise<Notification>
  createMany: (data: CreateNotificationData[]) => Promise<number>
  update: (id: string, data: UpdateNotificationData) => Promise<Notification>
  markAsRead: (id: string) => Promise<Notification>
  markAsUnread: (id: string) => Promise<Notification>
  softDelete: (id: string) => Promise<Notification>
  hardDelete: (id: string) => Promise<void>
  restore: (id: string) => Promise<Notification>
}
