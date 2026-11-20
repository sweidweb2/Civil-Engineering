/**
 * Inline background work. No queue — everything runs synchronously and must stay
 * idempotent (safe to retry). Add a durable runner only when a real need appears.
 */

import { loadConfig } from '../config/index.js'
import { withAdvisoryLock } from '../database/advisory-lock.js'
import { getLogger } from '../logging/index.js'
import { createAuthRepository } from '../modules/auth/auth.repository.js'
import { notifyUser } from '../modules/devices/index.js'
import { createFilesRepository } from '../modules/files/files.repository.js'
import { getStorageService } from '../storage/index.js'

const PURGE_DENIED_REFRESH_INTERVAL_MS = 60 * 60 * 1000
const PURGE_DELETED_FILES_INTERVAL_MS = 60 * 60 * 1000
const STALE_PENDING_MAX_AGE_MS = 24 * 60 * 60 * 1000
const FILE_CLEANUP_BATCH = 50
/** Stable Postgres advisory lock keys (multi-instance single-flight). */
const LOCK_PURGE_DENIED_REFRESH = 810_001
const LOCK_PURGE_DELETED_FILES = 810_002

let purgeDeniedRefreshTimer: ReturnType<typeof setInterval> | undefined
let purgeDeletedFilesTimer: ReturnType<typeof setInterval> | undefined
let lastDeletedFilesPurgeAt = 0

/**
 * Hard-delete an R2 object after soft-delete in Postgres.
 * Idempotent if the object is already gone; failures are logged, never thrown.
 * On success, removes the DELETED DB row so the hourly sweeper does not requeue it.
 */
export async function deleteStorageObject(payload: { fileId: string; key: string }): Promise<void> {
  try {
    const config = loadConfig()
    if (!config.storage) {
      getLogger().warn(
        { fileId: payload.fileId, key: payload.key, kind: 'jobs.storage_unconfigured' },
        'jobs.deleteStorageObject skipped — storage not configured',
      )
      return
    }
    const storage = getStorageService(config)
    await storage.deleteObject(payload.key)
    await createFilesRepository().hardDeleteIfDeleted(payload.fileId)
  } catch (error) {
    getLogger().error(
      {
        err: error,
        fileId: payload.fileId,
        key: payload.key,
      },
      'jobs.deleteStorageObject failed',
    )
  }
}

/** Delete expired refresh denylist rows (idempotent; one winner across API instances). */
export async function purgeExpiredDeniedRefreshTokens(): Promise<number> {
  if (!process.env.DATABASE_URL) {
    return 0
  }
  try {
    const removed = await withAdvisoryLock(LOCK_PURGE_DENIED_REFRESH, async () => {
      const count = await createAuthRepository().purgeExpiredDeniedRefreshTokens()
      if (count > 0) {
        getLogger().info({ removed: count }, 'jobs.purgeDeniedRefreshTokens')
      }
      return count
    })
    return removed ?? 0
  } catch (error) {
    getLogger().error({ err: error }, 'jobs.purgeDeniedRefreshTokens failed')
    return 0
  }
}

/**
 * Start a best-effort hourly purge of expired denied refresh tokens.
 * Safe to call once from process bootstrap; no-ops if already started.
 */
export function startDeniedRefreshTokenPurgeScheduler(): void {
  if (purgeDeniedRefreshTimer) return
  void purgeExpiredDeniedRefreshTokens()
  purgeDeniedRefreshTimer = setInterval(() => {
    void purgeExpiredDeniedRefreshTokens()
  }, PURGE_DENIED_REFRESH_INTERVAL_MS)
  purgeDeniedRefreshTimer.unref?.()
}

/**
 * Retry R2 deletes for soft-deleted files and claim stale PENDING rows.
 * Uses conditional PENDING→DELETED claims so complete() cannot race into a READY+missing-blob state.
 * Idempotent; one winner across API instances via Postgres advisory lock.
 */
export async function purgeDeletedFileObjects(): Promise<{
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

  try {
    const result = await withAdvisoryLock(LOCK_PURGE_DELETED_FILES, async () => {
      const repository = createFilesRepository()
      const storage = getStorageService(config)
      let deletedObjects = 0
      let stalePending = 0

      const deleted = await repository.listDeleted(FILE_CLEANUP_BATCH)
      for (const file of deleted) {
        try {
          await storage.deleteObject(file.key)
          await repository.hardDeleteIfDeleted(file.id)
          deletedObjects += 1
        } catch (error) {
          getLogger().error(
            { err: error, fileId: file.id, key: file.key },
            'jobs.purgeDeletedFileObjects delete failed',
          )
        }
      }

      const cutoff = new Date(Date.now() - STALE_PENDING_MAX_AGE_MS)
      const pending = await repository.listStalePending(cutoff, FILE_CLEANUP_BATCH)
      for (const file of pending) {
        try {
          // Claim first so a concurrent complete() cannot mark READY after we decide to GC.
          const claimed = await repository.claimStalePending(file.id)
          if (!claimed) continue
          try {
            await storage.deleteObject(claimed.key)
          } catch (error) {
            getLogger().warn(
              { err: error, fileId: claimed.id, key: claimed.key },
              'jobs.purgeDeletedFileObjects stale R2 delete failed — keeping DB row for retry',
            )
            continue
          }
          await repository.hardDeleteIfDeleted(claimed.id)
          stalePending += 1
        } catch (error) {
          getLogger().error(
            { err: error, fileId: file.id, key: file.key },
            'jobs.purgeDeletedFileObjects stale pending failed',
          )
        }
      }

      if (deletedObjects > 0 || stalePending > 0) {
        getLogger().info({ deletedObjects, stalePending }, 'jobs.purgeDeletedFileObjects')
      }
      return { deletedObjects, stalePending }
    })
    return result ?? { deletedObjects: 0, stalePending: 0 }
  } catch (error) {
    getLogger().error({ err: error }, 'jobs.purgeDeletedFileObjects failed')
    return { deletedObjects: 0, stalePending: 0 }
  }
}

/**
 * Throttled GC for serverless (Vercel) where setInterval does not run.
 * Safe to call from request paths (soft-delete / uploads); at most once per hour per instance.
 */
export function maybePurgeDeletedFileObjects(): void {
  const now = Date.now()
  if (now - lastDeletedFilesPurgeAt < PURGE_DELETED_FILES_INTERVAL_MS) return
  lastDeletedFilesPurgeAt = now
  void purgeDeletedFileObjects()
}

export function startDeletedFileObjectsPurgeScheduler(): void {
  if (purgeDeletedFilesTimer) return
  void purgeDeletedFileObjects()
  purgeDeletedFilesTimer = setInterval(() => {
    void purgeDeletedFileObjects()
  }, PURGE_DELETED_FILES_INTERVAL_MS)
  purgeDeletedFilesTimer.unref?.()
}

/** Boot all long-lived inline maintenance jobs (non-serverless). */
export function startBackgroundJobs(): void {
  startDeniedRefreshTokenPurgeScheduler()
  startDeletedFileObjectsPurgeScheduler()
}

export { notifyUser }
