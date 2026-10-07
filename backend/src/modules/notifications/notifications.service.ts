import type { AuthActor } from '../../auth/auth-actor.js'
import { forbidden, notFound, unauthorized } from '../../errors/app-error.js'
import type {
  BroadcastNotificationBody,
  CreateNotificationBody,
  ListNotificationsQuery,
  UpdateNotificationBody,
} from './notifications.schema.js'
import type { NotificationsRepository } from './notifications.types.js'
import type { Notification, NotificationWithSender } from './notifications.types.js'

export type NotificationsService = {
  listNotifications: (
    actor: AuthActor,
    query: ListNotificationsQuery
  ) => Promise<{ notifications: NotificationWithSender[]; total: number }>
  getNotification: (actor: AuthActor, id: string) => Promise<Notification>
  countUnread: (actor: AuthActor) => Promise<number>
  createNotification: (actor: AuthActor, input: CreateNotificationBody) => Promise<Notification>
  broadcastNotification: (actor: AuthActor, input: BroadcastNotificationBody) => Promise<{ count: number }>
  updateNotification: (actor: AuthActor, id: string, input: UpdateNotificationBody) => Promise<Notification>
  markAsRead: (actor: AuthActor, id: string) => Promise<Notification>
  markAsUnread: (actor: AuthActor, id: string) => Promise<Notification>
  softDelete: (actor: AuthActor, id: string) => Promise<Notification>
  hardDelete: (actor: AuthActor, id: string) => Promise<void>
  restore: (actor: AuthActor, id: string) => Promise<Notification>
}

export type NotificationsServiceDeps = {
  repository: NotificationsRepository
}

export function createNotificationsService(deps: NotificationsServiceDeps): NotificationsService {
  const { repository } = deps

  function assertSuper(actor: AuthActor): void {
    if (!actor.roles.includes('SUPER')) {
      throw forbidden('Only Super Admin can perform this action', 'SUPER_ONLY')
    }
  }

  async function loadOrThrow(id: string): Promise<Notification> {
    const notification = await repository.findById(id)
    if (!notification) {
      throw notFound('Notification not found', 'NOTIFICATION_NOT_FOUND')
    }
    return notification
  }

  function assertOwnerOrSuper(actor: AuthActor, notification: Notification): void {
    if (notification.receiverId !== actor.id && !actor.roles.includes('SUPER')) {
      throw forbidden('You can only access your own notifications', 'ACCESS_DENIED')
    }
  }

  return {
    async listNotifications(actor, query) {
      if (!actor.id) {
        throw unauthorized()
      }

      // Super Admin can see all notifications with includeDeleted
      // Regular users can only see their own non-deleted notifications
      if (actor.roles.includes('SUPER')) {
        return repository.findMany(query)
      }

      return repository.findMany({
        ...query,
        receiverId: actor.id,
        includeDeleted: false, // Regular users never see deleted
      })
    },

    async getNotification(actor, id) {
      if (!actor.id) {
        throw unauthorized()
      }

      const notification = await loadOrThrow(id)
      assertOwnerOrSuper(actor, notification)
      return notification
    },

    async countUnread(actor) {
      if (!actor.id) {
        throw unauthorized()
      }
      return repository.countUnread(actor.id)
    },

    async createNotification(actor, input) {
      assertSuper(actor)
      return repository.create({
        senderId: actor.id,
        receiverId: input.receiverId,
        type: input.type,
        title: input.title,
        message: input.message,
      })
    },

    async broadcastNotification(actor, input) {
      assertSuper(actor)

      const data = input.receiverIds.map((receiverId) => ({
        senderId: actor.id,
        receiverId,
        type: input.type,
        title: input.title,
        message: input.message,
      }))

      const count = await repository.createMany(data)
      return { count }
    },

    async updateNotification(actor, id, input) {
      assertSuper(actor)
      const notification = await loadOrThrow(id)

      // Prevent updating deleted notifications
      if (notification.deletedAt) {
        throw forbidden('Cannot update deleted notification', 'NOTIFICATION_DELETED')
      }

      return repository.update(id, input)
    },

    async markAsRead(actor, id) {
      if (!actor.id) {
        throw unauthorized()
      }

      const notification = await loadOrThrow(id)
      assertOwnerOrSuper(actor, notification)

      if (notification.deletedAt) {
        throw forbidden('Cannot mark deleted notification as read', 'NOTIFICATION_DELETED')
      }

      return repository.markAsRead(id)
    },

    async markAsUnread(actor, id) {
      if (!actor.id) {
        throw unauthorized()
      }

      const notification = await loadOrThrow(id)
      assertOwnerOrSuper(actor, notification)

      if (notification.deletedAt) {
        throw forbidden('Cannot mark deleted notification as unread', 'NOTIFICATION_DELETED')
      }

      return repository.markAsUnread(id)
    },

    async softDelete(actor, id) {
      if (!actor.id) {
        throw unauthorized()
      }

      const notification = await loadOrThrow(id)
      assertOwnerOrSuper(actor, notification)

      if (notification.deletedAt) {
        throw forbidden('Notification already deleted', 'ALREADY_DELETED')
      }

      return repository.softDelete(id)
    },

    async hardDelete(actor, id) {
      assertSuper(actor)
      const notification = await loadOrThrow(id)
      await repository.hardDelete(notification.id)
    },

    async restore(actor, id) {
      assertSuper(actor)
      const notification = await loadOrThrow(id)

      if (!notification.deletedAt) {
        throw forbidden('Notification is not deleted', 'NOT_DELETED')
      }

      return repository.restore(id)
    },
  }
}
