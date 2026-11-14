import { describe, expect, it, vi } from 'vitest'

import { createNotificationsService } from '../../src/modules/notifications/notifications.service.js'
import type {
  Notification,
  NotificationsRepository,
} from '../../src/modules/notifications/notifications.types.js'

const superAdmin = { id: 'super-1', roles: ['SUPER'] }
const owner = { id: 'user-1', roles: ['CLIENT'] }
const other = { id: 'user-2', roles: ['CLIENT'] }

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'n1',
    senderId: 'super-1',
    receiverId: owner.id,
    type: 'INFO',
    title: 'Hello',
    message: 'World',
    isRead: false,
    readAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  }
}

function setup(notification: Notification | null = makeNotification()) {
  const repository: NotificationsRepository = {
    countStates: vi.fn(async () => ({ active: 1, unread: 1, deleted: 0 })),
    findMany: vi.fn(async () => ({
      notifications: notification
        ? [
            {
              ...notification,
              sender: { id: 'super-1', email: 's@example.com', role: 'SUPER' },
              receiver: { id: notification.receiverId, email: 'o@example.com', name: 'Owner' },
            },
          ]
        : [],
      total: notification ? 1 : 0,
    })),
    findById: vi.fn(async () => notification),
    countUnread: vi.fn(async () => 2),
    markAllRead: vi.fn(async () => 2),
    create: vi.fn(async (data) => makeNotification({ ...data, id: 'n-new' })),
    createMany: vi.fn(async (data) => data.length),
    update: vi.fn(async (id, data) => makeNotification({ id, ...data })),
    markAsRead: vi.fn(async (id) => makeNotification({ id, isRead: true })),
    markAsUnread: vi.fn(async (id) => makeNotification({ id, isRead: false })),
    softDelete: vi.fn(async (id) =>
      makeNotification({ id, deletedAt: '2026-01-02T00:00:00.000Z' }),
    ),
    hardDelete: vi.fn(async () => undefined),
    restore: vi.fn(async (id) => makeNotification({ id, deletedAt: null })),
  }
  return { repository, service: createNotificationsService({ repository }) }
}

describe('notificationsService', () => {
  it('scopes list to the current user for non-super roles', async () => {
    const { service, repository } = setup()
    await service.listNotifications(owner, {
      page: 1,
      limit: 20,
      includeDeleted: false,
      mine: false,
    })
    expect(repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ receiverId: owner.id, includeDeleted: false }),
    )
  })

  it('lets SUPER list without forcing receiver scope', async () => {
    const { service, repository } = setup()
    await service.listNotifications(superAdmin, {
      page: 1,
      limit: 20,
      includeDeleted: true,
      mine: false,
    })
    expect(repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ includeDeleted: true }),
    )
    expect(repository.findMany).not.toHaveBeenCalledWith(
      expect.objectContaining({ receiverId: superAdmin.id }),
    )
  })

  it('forbids non-super from creating notifications', async () => {
    const { service } = setup()
    await expect(
      service.createNotification(owner, {
        receiverId: other.id,
        type: 'INFO',
        title: 'Hi',
        message: 'There',
      }),
    ).rejects.toMatchObject({ code: 'SUPER_ONLY', status: 403 })
  })

  it('lets SUPER broadcast to many receivers', async () => {
    const { service, repository } = setup()
    const result = await service.broadcastNotification(superAdmin, {
      receiverIds: ['user-1', 'user-2'],
      title: 'Announce',
      message: 'Hello all',
      type: 'ANNOUNCEMENT',
    })
    expect(result.count).toBe(2)
    expect(repository.createMany).toHaveBeenCalled()
  })

  it('scopes a mine=true list to the caller, including SUPER', async () => {
    const { service, repository } = setup()
    await service.listNotifications(superAdmin, {
      page: 1,
      limit: 8,
      includeDeleted: false,
      mine: true,
    })
    expect(repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ receiverId: superAdmin.id, includeDeleted: false }),
    )
  })

  it('marks every unread notification for the caller as read', async () => {
    const { service, repository } = setup()
    await expect(service.markAllRead(owner)).resolves.toBe(2)
    expect(repository.markAllRead).toHaveBeenCalledWith(owner.id)
  })

  it('lets the receiver mark as read', async () => {
    const { service, repository } = setup()
    await expect(service.markAsRead(owner, 'n1')).resolves.toMatchObject({ isRead: true })
    expect(repository.markAsRead).toHaveBeenCalledWith('n1')
  })

  it('forbids another user from reading a notification', async () => {
    const { service } = setup()
    await expect(service.getNotification(other, 'n1')).rejects.toMatchObject({
      code: 'ACCESS_DENIED',
      status: 403,
    })
  })

  it('blocks mark-as-read on soft-deleted notifications', async () => {
    const { service } = setup(makeNotification({ deletedAt: '2026-01-02T00:00:00.000Z' }))
    await expect(service.markAsRead(owner, 'n1')).rejects.toMatchObject({
      code: 'NOTIFICATION_DELETED',
      status: 403,
    })
  })

  it('only SUPER can hard-delete', async () => {
    const { service, repository } = setup()
    await expect(service.hardDelete(owner, 'n1')).rejects.toMatchObject({
      code: 'SUPER_ONLY',
      status: 403,
    })
    await service.hardDelete(superAdmin, 'n1')
    expect(repository.hardDelete).toHaveBeenCalledWith('n1')
  })
})
