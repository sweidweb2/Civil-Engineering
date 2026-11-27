import { Platform } from 'react-native'

/**
 * Read-only offline snapshots (Docs/[3] Decisions/[14] Mobile Offline Read Cache.md).
 *
 * `useRemoteData({ persist: true })` saves each successful response here. When a
 * request is slow or fails without a server response and nothing is on screen yet,
 * the hook shows the last saved copy. Online, the in-memory cache (`remoteCache`)
 * stays the source of truth.
 *
 * - The call site decides what is saved (`persist`): only the signed-in user's own
 *   working data — dashboards, own profile / CV, own projects, page 1 of own lists
 *   without a search, own listing detail, PM directory. Admin lists of other people
 *   are not saved.
 * - Per user, one small index (`key → savedAt`) plus one file per entry, in the OS
 *   cache directory (excluded from backups, may be purged — fine for a cache). A save
 *   serializes only its own payload; entries are read from disk lazily on first use.
 *   Everything is deleted on logout / session expiry.
 * - Bounded: at most `OFFLINE_MAX_ENTRIES` entries, each at most `OFFLINE_MAX_AGE_MS` old.
 * - Web: disabled (no file system; civil-web is the web client).
 */

/**
 * Bumped when the on-disk layout or persisted payload shapes change; old folders and
 * files are deleted on the next clear and never read.
 */
const DIR_PREFIX = 'offline-snapshot-v3-'
/** Leftover single-file snapshots from earlier versions, deleted on clear. */
const LEGACY_FILE_PREFIXES = ['offline-snapshot-v1-', 'offline-snapshot-v2-'] as const
const INDEX_FILE = 'index.json'

export const OFFLINE_MAX_ENTRIES = 40
export const OFFLINE_MAX_AGE_MS = 7 * 24 * 60 * 60_000

type Entry = { data: unknown; savedAt: number }
/** Index file: cache key → epoch ms the entry was saved (insertion order = save order). */
type IndexFile = { userId: string; keys: Record<string, number> }

/** Where snapshots live. Default: expo-file-system cache directory (native only). */
export type OfflineSnapshotStorage = {
  readIndex: (userId: string) => Promise<string | null>
  writeIndex: (userId: string, text: string) => Promise<void>
  readEntry: (userId: string, key: string) => Promise<string | null>
  writeEntry: (userId: string, key: string, text: string) => Promise<void>
  removeEntry: (userId: string, key: string) => void
  clearAll: () => void
}

const safe = (value: string) => value.replace(/[^A-Za-z0-9_-]/g, '_')

/** Collision-free file name for a cache key (keys contain `:` and `/`). */
function entryFileName(key: string) {
  return `${encodeURIComponent(key).replace(/[^A-Za-z0-9_.-]/g, '_')}.json`
}

function createFileStorage(): OfflineSnapshotStorage {
  // Loaded lazily so the module (and its tests) do not need the native module.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = () => require('expo-file-system') as typeof import('expo-file-system')
  const dir = (userId: string) => {
    const { Directory, Paths } = fs()
    const directory = new Directory(Paths.cache, `${DIR_PREFIX}${safe(userId)}`)
    if (!directory.exists) directory.create({ idempotent: true, intermediates: true })
    return directory
  }
  const file = (userId: string, name: string) => new (fs().File)(dir(userId), name)
  const readText = async (userId: string, name: string) => {
    const target = file(userId, name)
    return target.exists ? await target.text() : null
  }
  return {
    readIndex: (userId) => readText(userId, INDEX_FILE),
    writeIndex: (userId, text) => file(userId, INDEX_FILE).write(text),
    readEntry: (userId, key) => readText(userId, entryFileName(key)),
    writeEntry: (userId, key, text) => file(userId, entryFileName(key)).write(text),
    removeEntry(userId, key) {
      const target = file(userId, entryFileName(key))
      if (target.exists) target.delete()
    },
    clearAll() {
      const { Directory, Paths } = fs()
      for (const item of Paths.cache.list()) {
        const name = item.uri.replace(/\/$/, '').split('/').pop() ?? ''
        const ours =
          (item instanceof Directory && name.startsWith(DIR_PREFIX)) ||
          LEGACY_FILE_PREFIXES.some((prefix) => name.startsWith(prefix))
        if (ours) item.delete()
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

type Loaded = {
  userId: string
  /** key → savedAt, oldest save first. */
  index: Map<string, number>
  /** Entries already read from (or written to) disk this session. */
  entries: Map<string, Entry>
}

let loaded: Loaded | null = null
let loading: Promise<void> | null = null
/** Bumped by clearAll so a load that started before a logout cannot repopulate memory. */
let generation = 0

const isFresh = (savedAt: number, now = Date.now()) => now - savedAt <= OFFLINE_MAX_AGE_MS

async function ensureLoaded(userId: string, retried = false): Promise<void> {
  if (loaded?.userId === userId) return
  if (!loading) {
    const startedAt = generation
    loading = (async () => {
      const index = new Map<string, number>()
      try {
        const text = storage ? await storage.readIndex(userId) : null
        const parsed = text ? (JSON.parse(text) as IndexFile) : null
        if (parsed?.userId === userId) {
          for (const [key, savedAt] of Object.entries(parsed.keys)) {
            if (isFresh(savedAt)) index.set(key, savedAt)
          }
        }
      } catch {
        // Corrupt or unreadable index: start empty; the next save replaces it.
      }
      if (startedAt === generation) loaded = { userId, index, entries: new Map() }
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

let indexWrites: Promise<void> = Promise.resolve()

/** Queue an index write; each one serializes the latest state, so writes never land out of order. */
function writeIndex(state: Loaded) {
  indexWrites = indexWrites.then(async () => {
    if (!storage || loaded !== state) return
    const file: IndexFile = { userId: state.userId, keys: Object.fromEntries(state.index) }
    await storage.writeIndex(state.userId, JSON.stringify(file)).catch(() => undefined)
  })
}

/** Resolves once queued index writes have finished (tests). */
export function offlineSnapshotSettled() {
  return indexWrites
}

/** Remember a successful response for offline reading. The caller decides what to persist. */
export async function offlineSnapshotPut(userId: string, key: string, data: unknown) {
  if (!storage) return
  await ensureLoaded(userId)
  const state = loaded
  if (!state || state.userId !== userId) return
  const savedAt = Date.now()
  state.index.delete(key)
  state.index.set(key, savedAt)
  state.entries.set(key, { data, savedAt })
  // Map keeps insertion order: drop the least recently saved past the cap.
  while (state.index.size > OFFLINE_MAX_ENTRIES) {
    const oldest = state.index.keys().next().value
    if (oldest === undefined) break
    state.index.delete(oldest)
    state.entries.delete(oldest)
    try {
      storage.removeEntry(userId, oldest)
    } catch {
      // Already gone.
    }
  }
  // Best effort: disk full / no permission just means no offline copy.
  try {
    await storage.writeEntry(userId, key, JSON.stringify(data))
  } catch {
    return
  }
  if (loaded === state) writeIndex(state)
}

/** Last saved response for `key`, if any and not too old. */
export async function offlineSnapshotGet(userId: string, key: string): Promise<Entry | undefined> {
  if (!storage) return undefined
  await ensureLoaded(userId)
  const state = loaded
  if (!state || state.userId !== userId) return undefined
  const savedAt = state.index.get(key)
  if (savedAt === undefined || !isFresh(savedAt)) return undefined
  const cached = state.entries.get(key)
  if (cached) return cached
  try {
    const text = await storage.readEntry(userId, key)
    if (text === null || loaded !== state) return undefined
    const entry: Entry = { data: JSON.parse(text), savedAt }
    state.entries.set(key, entry)
    return entry
  } catch {
    return undefined
  }
}

/** Forget every saved snapshot (logout, session expiry, account switch). */
export function offlineSnapshotClearAll() {
  generation += 1
  loaded = null
  loading = null
  try {
    storage?.clearAll()
  } catch {
    // Nothing to delete / not readable.
  }
}
