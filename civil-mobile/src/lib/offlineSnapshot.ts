import { Platform } from 'react-native'

/**
 * Read-only offline snapshots (Docs/[3] Decisions/[14] Mobile Offline Read Cache.md).
 *
 * When a keyed request fails because the device is offline and nothing is on screen
 * yet, `useRemoteData` falls back to the last successful response saved here. Online
 * behaviour is unchanged: the in-memory cache (`remoteCache`) stays the source of
 * truth and this file is only read as a fallback.
 *
 * - Only the signed-in user's own working data is persisted (`isPersistableKey`):
 *   dashboards, own profile / CV, own projects + stages, page 1 of own lists, own
 *   listing detail, PM directory page 1. Admin lists of other people are not.
 * - One JSON file per user in the OS cache directory (excluded from backups, may be
 *   purged by the OS — acceptable for a cache). Deleted on logout / session expiry.
 * - Bounded: at most `MAX_ENTRIES` entries, each at most `MAX_AGE_MS` old.
 * - Web: disabled (no file system; civil-web is the web client).
 */

const FORMAT_VERSION = 1
const FILE_PREFIX = 'offline-snapshot-v1-'
export const OFFLINE_MAX_ENTRIES = 40
export const OFFLINE_MAX_AGE_MS = 7 * 24 * 60 * 60_000
const WRITE_DELAY_MS = 1_500

const PERSISTABLE: RegExp[] = [
  /^dashboard:/,
  /^(workers|providers):me$/,
  /^projects:(detail|stages):[^:]+$/,
  /^projects:list:summary$/,
  /^projects:list:[^:]*:cards:1::[^:]*$/,
  /^listings:mine:grid:1::[^:]*$/,
  /^listings:detail:[^:]+:view$/,
  /^directory:list:pm:[^:]+:1:$/,
]

/** True for cache keys that may be saved for offline reading (own data, page 1, no search). */
export function isPersistableKey(key: string) {
  return PERSISTABLE.some((pattern) => pattern.test(key))
}

type Entry = { data: unknown; savedAt: number }
type SnapshotFile = { version: number; userId: string; entries: Record<string, Entry> }

/** Where snapshots live. Default: expo-file-system cache directory (native only). */
export type OfflineSnapshotStorage = {
  read: (userId: string) => Promise<string | null>
  write: (userId: string, text: string) => void
  clearAll: () => void
}

function fileName(userId: string) {
  return `${FILE_PREFIX}${userId.replace(/[^A-Za-z0-9_-]/g, '_')}.json`
}

function createFileStorage(): OfflineSnapshotStorage {
  // Loaded lazily so the module (and its tests) do not need the native module.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = () => require('expo-file-system') as typeof import('expo-file-system')
  return {
    async read(userId) {
      const { File, Paths } = fs()
      const file = new File(Paths.cache, fileName(userId))
      return file.exists ? await file.text() : null
    },
    write(userId, text) {
      const { File, Paths } = fs()
      new File(Paths.cache, fileName(userId)).write(text)
    },
    clearAll() {
      const { File, Paths } = fs()
      for (const item of Paths.cache.list()) {
        const name = item.uri.split('/').pop() ?? ''
        if (item instanceof File && name.startsWith(FILE_PREFIX)) item.delete()
      }
    },
  }
}

let storage: OfflineSnapshotStorage | null = Platform.OS === 'web' ? null : createFileStorage()

/** Tests (and web) can swap the storage; `null` disables persistence. */
export function setOfflineSnapshotStorage(next: OfflineSnapshotStorage | null) {
  storage = next
  loaded = null
  loading = null
}

let loaded: { userId: string; entries: Map<string, Entry> } | null = null
let loading: Promise<void> | null = null
/** Bumped by clearAll so a load that started before a logout cannot repopulate memory. */
let generation = 0
let writeTimer: ReturnType<typeof setTimeout> | undefined

function isFresh(entry: Entry, now = Date.now()) {
  return now - entry.savedAt <= OFFLINE_MAX_AGE_MS
}

async function ensureLoaded(userId: string, retried = false): Promise<void> {
  if (loaded?.userId === userId) return
  if (!loading) {
    const startedAt = generation
    loading = (async () => {
      const entries = new Map<string, Entry>()
      try {
        const text = storage ? await storage.read(userId) : null
        const parsed = text ? (JSON.parse(text) as SnapshotFile) : null
        if (parsed?.version === FORMAT_VERSION && parsed.userId === userId) {
          for (const [key, entry] of Object.entries(parsed.entries)) {
            if (isFresh(entry)) entries.set(key, entry)
          }
        }
      } catch {
        // Corrupt or unreadable file: start empty; the next write replaces it.
      }
      if (startedAt === generation) loaded = { userId, entries }
    })().finally(() => {
      loading = null
    })
  }
  await loading
  // Another user's load was in flight, or a clear happened: load again for this user once.
  if (loaded?.userId !== userId && !loading) {
    if (!retried) await ensureLoaded(userId, true)
  }
}

function scheduleWrite() {
  if (writeTimer) return
  writeTimer = setTimeout(() => {
    writeTimer = undefined
    flushOfflineSnapshot()
  }, WRITE_DELAY_MS)
}

/** Write pending changes now (also used by tests). */
export function flushOfflineSnapshot() {
  if (writeTimer) {
    clearTimeout(writeTimer)
    writeTimer = undefined
  }
  if (!storage || !loaded) return
  const file: SnapshotFile = {
    version: FORMAT_VERSION,
    userId: loaded.userId,
    entries: Object.fromEntries(loaded.entries),
  }
  try {
    storage.write(loaded.userId, JSON.stringify(file))
  } catch {
    // Disk full / no permission: offline fallback is best effort.
  }
}

/** Remember a successful response for offline reading (no-op for non-persistable keys). */
export async function offlineSnapshotPut(userId: string, key: string, data: unknown) {
  if (!storage || !isPersistableKey(key)) return
  await ensureLoaded(userId)
  if (!loaded || loaded.userId !== userId) return
  const { entries } = loaded
  entries.delete(key)
  entries.set(key, { data, savedAt: Date.now() })
  // Map keeps insertion order: drop the least recently saved past the cap.
  while (entries.size > OFFLINE_MAX_ENTRIES) {
    const oldest = entries.keys().next().value
    if (oldest === undefined) break
    entries.delete(oldest)
  }
  scheduleWrite()
}

/** Last saved response for `key`, if any and not too old. */
export async function offlineSnapshotGet(userId: string, key: string): Promise<Entry | undefined> {
  if (!storage || !isPersistableKey(key)) return undefined
  await ensureLoaded(userId)
  const entry = loaded?.userId === userId ? loaded.entries.get(key) : undefined
  return entry && isFresh(entry) ? entry : undefined
}

/** Forget every saved snapshot (logout, session expiry, account switch). */
export function offlineSnapshotClearAll() {
  if (writeTimer) {
    clearTimeout(writeTimer)
    writeTimer = undefined
  }
  generation += 1
  loaded = null
  loading = null
  try {
    storage?.clearAll()
  } catch {
    // Nothing to delete / not readable.
  }
}
