/**
 * Background work wrappers. No queue: everything runs inline and must stay idempotent
 * (safe to retry) — add a durable runner only when a real need appears.
 */

import { loadConfig } from '../config/index.js'
import { getLogger } from '../logging/index.js'
import { createAuthRepository } from '../modules/auth/auth.repository.js'
import type { NotifyUserPayload } from '../modules/devices/devices.types.js'
import { notifyUser } from '../modules/devices/index.js'
import { createFilesRepository } from '../modules/files/files.repository.js'
import { getStorageService } from '../storage/index.js'

const PURGE_DENIED_REFRESH_INTERVAL_MS = 60 * 60 * 1000
const PURGE_DELETED_FILES_INTERVAL_MS = 60 * 60 * 1000
const STALE_PENDING_MAX_AGE_MS = 24 * 60 * 60 * 1000
const FILE_CLEANUP_BATCH = 50

let purgeDeniedRefreshTimer: ReturnType<typeof setInterval> | undefined
let purgeDeletedFilesTimer: ReturnType<typeof setInterval> | undefined

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

/** Delete expired refresh denylist rows (idempotent). */
export async function enqueuePurgeExpiredDeniedRefreshTokens(): Promise<number> {
  if (!process.env.DATABASE_URL) {
    return 0
  }
  try {
    const removed = await createAuthRepository().purgeExpiredDeniedRefreshTokens()
    if (removed > 0) {
      getLogger().info({ removed }, 'jobs.purgeDeniedRefreshTokens')
    }
    return removed
  } catch (error) {
    getLogger().error(
      { message: error instanceof Error ? error.message : String(error) },
      'jobs.purgeDeniedRefreshTokens failed',
    )
    return 0
  }
}

/**
 * Start a best-effort hourly purge of expired denied refresh tokens.
 * Safe to call once from process bootstrap; no-ops if already started.
 */
export function startDeniedRefreshTokenPurgeScheduler(): void {
  if (purgeDeniedRefreshTimer) return
  void enqueuePurgeExpiredDeniedRefreshTokens()
  purgeDeniedRefreshTimer = setInterval(() => {
    void enqueuePurgeExpiredDeniedRefreshTokens()
  }, PURGE_DENIED_REFRESH_INTERVAL_MS)
  purgeDeniedRefreshTimer.unref?.()
}

/**
 * Retry R2 deletes for soft-deleted files and mark stale PENDING rows deleted.
 * Idempotent; failures are logged and retried next interval.
 */
export async function enqueuePurgeDeletedFileObjects(): Promise<{
  deletedObjects: number
  stalePending: number
}> {
  if (!process.env.DATABASE_URL) {
    return { deletedObjects: 0, stalePending: 0 }
  }

  const config = loadConfig()
  if (!config.storage) {
    return { deletedObjects: 0, stalePending: 0 }
  }

  const repository = createFilesRepository()
  const storage = getStorageService(config)
  let deletedObjects = 0
  let stalePending = 0

  try {
    const deleted = await repository.listDeleted(FILE_CLEANUP_BATCH)
    for (const file of deleted) {
      try {
        await storage.deleteObject(file.key)
        deletedObjects += 1
      } catch (error) {
        getLogger().error(
          {
            fileId: file.id,
            key: file.key,
            message: error instanceof Error ? error.message : String(error),
          },
          'jobs.purgeDeletedFileObjects delete failed',
        )
      }
    }

    const cutoff = new Date(Date.now() - STALE_PENDING_MAX_AGE_MS)
    const pending = await repository.listStalePending(cutoff, FILE_CLEANUP_BATCH)
    for (const file of pending) {
      try {
        await repository.markDeleted(file.id)
        await storage.deleteObject(file.key).catch(() => undefined)
        stalePending += 1
      } catch (error) {
        getLogger().error(
          {
            fileId: file.id,
            key: file.key,
            message: error instanceof Error ? error.message : String(error),
          },
          'jobs.purgeDeletedFileObjects stale pending failed',
        )
      }
    }

    if (deletedObjects > 0 || stalePending > 0) {
      getLogger().info({ deletedObjects, stalePending }, 'jobs.purgeDeletedFileObjects')
    }
  } catch (error) {
    getLogger().error(
      { message: error instanceof Error ? error.message : String(error) },
      'jobs.purgeDeletedFileObjects failed',
    )
  }

  return { deletedObjects, stalePending }
}

export function startDeletedFileObjectsPurgeScheduler(): void {
  if (purgeDeletedFilesTimer) return
  void enqueuePurgeDeletedFileObjects()
  purgeDeletedFilesTimer = setInterval(() => {
    void enqueuePurgeDeletedFileObjects()
  }, PURGE_DELETED_FILES_INTERVAL_MS)
  purgeDeletedFilesTimer.unref?.()
}

/** Boot all long-lived inline maintenance jobs (non-serverless). */
export function startBackgroundJobs(): void {
  startDeniedRefreshTokenPurgeScheduler()
  startDeletedFileObjectsPurgeScheduler()
}

export { notifyUser }
