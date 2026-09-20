/**
 * Background jobs / workers.
 *
 * Decision: Docs/[3] Decisions/[8] Redis.md
 * - Queue library when needed: BullMQ
 * - Layout: enqueue wrappers here; workers in jobs/workers/ when wired
 * - Today: push notify may still run sync via enqueueNotifyUser
 */

import { notifyUser } from '../modules/devices/index.js'
import type { NotifyUserPayload } from '../modules/devices/devices.types.js'

export type JobName = 'notify-user'

export type JobEnvelope<TPayload> = {
  name: JobName
  payload: TPayload
  /** Caller-supplied key so retries are safe to replay */
  idempotencyKey?: string
}

/**
 * Enqueue (or run) a user push notification.
 * Sync until BullMQ worker is introduced — same function signature stays.
 */
export async function enqueueNotifyUser(
  userId: string,
  payload: NotifyUserPayload,
  _options?: { idempotencyKey?: string },
): Promise<void> {
  // TODO(BullMQ): push onto queue with retries / dead-letter instead of sync await
  await notifyUser(userId, payload)
}

export { notifyUser }
