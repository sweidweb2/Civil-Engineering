/**
 * Background job seams (sync today).
 * Notify + storage delete run inline until a real queue is justified later.
 */

import { loadConfig } from '../config/index.js'
import { getLogger } from '../logging/index.js'
import type { NotifyUserPayload } from '../modules/devices/devices.types.js'
import { notifyUser } from '../modules/devices/index.js'
import { getStorageService } from '../storage/index.js'

export type JobName = 'notify-user' | 'delete-storage-object'

export type JobEnvelope<TPayload> = {
  name: JobName
  payload: TPayload
  /** Caller-supplied key so retries are safe to replay */
  idempotencyKey?: string
}

/** Run a user push notification (sync). */
export async function enqueueNotifyUser(
  userId: string,
  payload: NotifyUserPayload,
  _options?: { idempotencyKey?: string },
): Promise<void> {
  await notifyUser(userId, payload)
}

/**
 * Hard-delete an R2 object after soft-delete in Postgres.
 * Sync — idempotent if the object is already gone.
 */
export async function enqueueDeleteStorageObject(
  payload: { fileId: string; key: string },
  _options?: { idempotencyKey?: string },
): Promise<void> {
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
