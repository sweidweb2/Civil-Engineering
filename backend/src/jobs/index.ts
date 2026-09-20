/**
 * Background jobs / workers.
 *
 * Decision: Docs/[3] Decisions/[8] Redis.md
 * - Queue library when needed: BullMQ
 * - Layout: enqueue wrappers here; workers in jobs/workers/ when wired
 * - Retry / failed-job defaults: jobs/workers/job.defaults.ts
 * - Today: push notify may still run sync via enqueueNotifyUser
 * - Storage object delete runs sync until BullMQ (Docs/[3] Decisions/[10] Storage)
 */

import { getLogger } from '../logging/index.js'
import { notifyUser } from '../modules/devices/index.js'
import type { NotifyUserPayload } from '../modules/devices/devices.types.js'
import { loadConfig } from '../config/index.js'
import { getStorageService } from '../storage/index.js'

export type JobName = 'notify-user' | 'delete-storage-object'

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

/**
 * Hard-delete an R2 object after soft-delete in Postgres.
 * Sync stub until BullMQ — idempotent if the object is already gone.
 */
export async function enqueueDeleteStorageObject(
  payload: { fileId: string; key: string },
  _options?: { idempotencyKey?: string },
): Promise<void> {
  // TODO(BullMQ): queue delete-storage-object with retries
  try {
    const config = loadConfig()
    if (!config.storage) {
      return
    }
    const storage = getStorageService(config)
    await storage.deleteObject(payload.key)
  } catch (error) {
    getLogger().error(
      {
        fileId: payload.fileId,
        key: payload.key,
        message: error instanceof Error ? error.message : String(error),
      },
      'jobs.deleteStorageObject failed',
    )
  }
}

export { notifyUser }
