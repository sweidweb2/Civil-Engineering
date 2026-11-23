import { prisma } from '../../database/prisma.js'
import { Prisma } from '../../generated/prisma/client.js'
import type {
  Notification,
  NotificationsRepository,
  NotificationWithSender,
} from './notifications.types.js'

type NotificationRow = Prisma.NotificationGetPayload<object>

type NotificationWithSenderRow = Prisma.NotificationGetPayload<{
  include: {
    sender: {
      select: {
        id: true
        email: true
        role: true
      }
    }
    receiver: {
      select: {
        id: true
        email: true
        profile: {
          select: {
            displayName: true
            firstName: true
            lastName: true
          }
        }
      }
    }
  }
}>

function personName(
  profile: {
    displayName: string | null
    firstName: string | null
    lastName: string | null
  } | null,
): string {
  const named =
    profile?.displayName?.trim() ||
    [profile?.firstName, profile?.lastName].filter(Boolean).join(' ')
  return named || ''
}

function mapToNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    senderId: row.senderId,
    receiverId: row.receiverId,
    type: row.type,
    title: row.title,
    message: row.message,
    isRead: row.isRead,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    deletedAt: row.deletedAt?.toISOString() ?? null,
  }
}

function mapToNotificationWithSender(row: NotificationWithSenderRow): NotificationWithSender {
  return {
    ...mapToNotification(row),
    sender: row.sender
      ? {
          id: row.sender.id,
          email: row.sender.email,
          role: row.sender.role,
        }
      : null,
    receiver: row.receiver
      ? {
          id: row.receiver.id,
          email: row.receiver.email,
          name: personName(row.receiver.profile) || row.receiver.email,
        }
      : {
          id: row.receiverId,
          email: '',
          name: '',
        },
  }
}

export function createNotificationsRepository(): NotificationsRepository {
  return {
    async findMany(query) {
      const page = query.page ?? 1
      const limit = query.limit ?? 20
      const skip = (page - 1) * limit

      const where: Prisma.NotificationWhereInput = {}
      if (query.receiverId) {
        where.receiverId = query.receiverId
      }
      if (!query.includeDeleted) {
        where.deletedAt = null
      }

      const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
          skip,
          take: limit,
          where,
          include: {
            sender: {
              select: {
                id: true,
                email: true,
                role: true,
              },
            },
            receiver: {
              select: {
                id: true,
                email: true,
                profile: {
                  select: {
                    displayName: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.notification.count({ where }),
      ])

      return {
        notifications: notifications.map(mapToNotificationWithSender),
        total,
      }
    },

    async countStates(receiverId) {
      const [row] = await prisma.$queryRaw<
        Array<{ active: number; unread: number; deleted: number }>
      >`
        SELECT
          COUNT(*) FILTER (WHERE "deletedAt" IS NULL)::int AS active,
          COUNT(*) FILTER (WHERE "deletedAt" IS NULL AND "isRead" = false)::int AS unread,
          COUNT(*) FILTER (WHERE "deletedAt" IS NOT NULL)::int AS deleted
        FROM "notifications"
        ${receiverId ? Prisma.sql`WHERE "receiverId" = ${receiverId}` : Prisma.empty}
      `
      return {
        active: row?.active ?? 0,
        unread: row?.unread ?? 0,
        deleted: row?.deleted ?? 0,
      }
    },

    async findById(id) {
      const notification = await prisma.notification.findUnique({ where: { id } })
      return notification ? mapToNotification(notification) : null
    },

    async countUnread(receiverId) {
      return prisma.notification.count({
        where: {
          receiverId,
          isRead: false,
          deletedAt: null,
        },
      })
    },

    async markAllRead(receiverId) {
      const result = await prisma.notification.updateMany({
        where: {
          receiverId,
          isRead: false,
          deletedAt: null,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      })
      return result.count
    },

    async create(data) {
      const notification = await prisma.notification.create({
        data: {
          senderId: data.senderId ?? null,
          receiverId: data.receiverId,
          type: data.type ?? 'INFO',
          title: data.title,
          message: data.message,
        },
      })
      return mapToNotification(notification)
    },

    async createMany(data) {
      const result = await prisma.notification.createMany({
        data: data.map((item) => ({
          senderId: item.senderId ?? null,
          receiverId: item.receiverId,
          type: item.type ?? 'INFO',
          title: item.title,
          message: item.message,
        })),
      })
      return result.count
    },

    async update(id, data) {
      const notification = await prisma.notification.update({
        where: { id },
        data,
      })
      return mapToNotification(notification)
    },

    async markAsRead(id) {
      const notification = await prisma.notification.update({
        where: { id },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      })
      return mapToNotification(notification)
    },

    async markAsUnread(id) {
      const notification = await prisma.notification.update({
        where: { id },
        data: {
          isRead: false,
          readAt: null,
        },
      })
      return mapToNotification(notification)
    },

    async softDelete(id) {
      const notification = await prisma.notification.update({
        where: { id },
        data: { deletedAt: new Date() },
      })
      return mapToNotification(notification)
    },

    async hardDelete(id) {
      await prisma.notification.delete({ where: { id } })
    },

    async restore(id) {
      const notification = await prisma.notification.update({
        where: { id },
        data: { deletedAt: null },
      })
      return mapToNotification(notification)
    },
  }
}
