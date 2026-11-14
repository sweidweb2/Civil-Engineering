/**
 * Background work wrappers. No queue: everything runs inline and must stay idempotent
 * (safe to retry) — add a durable runner only when a real need appears.
 */

import { loadConfig } from '../config/index.js'
import { getLogger } from '../logging/index.js'
import type { NotifyUserPayload } from '../modules/devices/devices.types.js'
import { notifyUser } from '../modules/devices/index.js'
import { getStorageService } from '../storage/index.js'

/** Send a user push notification (best-effort, inline). */
export function enqueueNotifyUser(userId: string, payload: NotifyUserPayload): Promise<void> {
  return notifyUser(userId, payload)
}

/**
 * Hard-delete an R2 object after soft-delete in Postgres.
 * Idempotent if the object is already gone; failures are logged, never thrown.
 */
export async function enqueueDeleteStorageObject(payload: {
  fileId: string
  key: string
}): Promise<void> {
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
