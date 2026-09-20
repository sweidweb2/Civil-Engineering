import { prisma } from '../../database/prisma.js'
import type { Prisma } from '../../generated/prisma/client.js'

export type CreateActivityInput = {
  userId?: string | null
  action: string
  entity?: string | null
  entityId?: string | null
  meta?: Prisma.InputJsonValue
  ip?: string | null
  requestId?: string | null
}

export type CreateErrorInput = {
  requestId?: string | null
  userId?: string | null
  code?: string | null
  message: string
  stack?: string | null
  path?: string | null
  method?: string | null
  status?: number | null
}

export type ActivityLogRecord = {
  id: string
  userId: string | null
  action: string
  entity: string | null
  entityId: string | null
  meta: Prisma.JsonValue
  ip: string | null
  requestId: string | null
  createdAt: Date
  user: { id: string; email: string; role: string } | null
}

export type ErrorLogRecord = {
  id: string
  requestId: string | null
  userId: string | null
  code: string | null
  message: string
  stack: string | null
  path: string | null
  method: string | null
  status: number | null
  createdAt: Date
}

export type LoggingRepository = {
  createActivity: (input: CreateActivityInput) => Promise<void>
  createError: (input: CreateErrorInput) => Promise<void>
  listActivity: (
    page: number,
    limit: number,
  ) => Promise<{
    items: ActivityLogRecord[]
    total: number
  }>
  listErrors: (
    page: number,
    limit: number,
  ) => Promise<{
    items: ErrorLogRecord[]
    total: number
  }>
}

export function createLoggingRepository(): LoggingRepository {
  return {
    async createActivity(input) {
      await prisma.activityLog.create({
        data: {
          userId: input.userId ?? null,
          action: input.action,
          entity: input.entity ?? null,
          entityId: input.entityId ?? null,
          meta: input.meta ?? undefined,
          ip: input.ip ?? null,
          requestId: input.requestId ?? null,
        },
      })
    },

    async createError(input) {
      await prisma.errorLog.create({
        data: {
          requestId: input.requestId ?? null,
          userId: input.userId ?? null,
          code: input.code ?? null,
          message: input.message,
          stack: input.stack ?? null,
          path: input.path ?? null,
          method: input.method ?? null,
          status: input.status ?? null,
        },
      })
    },

    async listActivity(page, limit) {
      const skip = (page - 1) * limit
      const [items, total] = await Promise.all([
        prisma.activityLog.findMany({
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
            user: { select: { id: true, email: true, role: true } },
          },
        }),
        prisma.activityLog.count(),
      ])
      return { items, total }
    },

    async listErrors(page, limit) {
      const skip = (page - 1) * limit
      const [items, total] = await Promise.all([
        prisma.errorLog.findMany({
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.errorLog.count(),
      ])
      return { items, total }
    },
  }
}
