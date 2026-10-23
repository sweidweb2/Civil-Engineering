import { z } from 'zod'

export const notificationTypeSchema = z.enum([
  'INFO',
  'SUCCESS',
  'WARNING',
  'ERROR',
  'ANNOUNCEMENT',
  'SYSTEM',
])

export const createNotificationBodySchema = z.object({
  receiverId: z.string().min(1, 'Receiver ID is required'),
  type: notificationTypeSchema.optional().default('INFO'),
  title: z.string().min(1, 'Title is required').max(200),
  message: z.string().min(1, 'Message is required').max(2000),
})

export const broadcastNotificationBodySchema = z.object({
  receiverIds: z.array(z.string()).min(1, 'At least one receiver is required').max(100),
  type: notificationTypeSchema.optional().default('INFO'),
  title: z.string().min(1, 'Title is required').max(200),
  message: z.string().min(1, 'Message is required').max(2000),
})

export const updateNotificationBodySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  message: z.string().min(1).max(2000).optional(),
  type: notificationTypeSchema.optional(),
  isRead: z.boolean().optional(),
})

export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  includeDeleted: z.coerce.boolean().optional().default(false),
  mine: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
})

export type CreateNotificationBody = z.infer<typeof createNotificationBodySchema>
export type BroadcastNotificationBody = z.infer<typeof broadcastNotificationBodySchema>
export type UpdateNotificationBody = z.infer<typeof updateNotificationBodySchema>
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>
