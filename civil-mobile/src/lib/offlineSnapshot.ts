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
 * Bumped when the on-disk layout or persisted payload shapes change. The previous
 * single-file layout (v2) is migrated once on first load; older files are deleted on clear.
 */
const DIR_PREFIX = 'offline-snapshot-v3-'
const LEGACY_V2_PREFIX = 'offline-snapshot-v2-'
/** Payload format of v2 files that may be migrated (older ones hold other shapes). */
const LEGACY_V2_VERSION = 2
/** Leftover single-file snapshots from earlier versions, deleted on clear. */
const LEGACY_FILE_PREFIXES = ['offline-snapshot-v1-', LEGACY_V2_PREFIX] as const
const INDEX_FILE = 'index.json'

export const OFFLINE_MAX_ENTRIES = 40
export const OFFLINE_MAX_AGE_MS = 7 * 24 * 60 * 60_000

type Entry = { data: unknown; savedAt: number }
/** Index file: cache key → epoch ms the entry was saved (insertion order = save order). */
type IndexFile = { userId: string; keys: Record<string, number> }
/** v2 layout: one file per user holding every entry. */
type LegacyFile = { version: number; userId: string; entries: Record<string, Entry> }

/** Where snapshots live. Default: expo-file-system cache directory (native only). */
export type OfflineSnapshotStorage = {
  readIndex: (userId: string) => Promise<string | null>
  writeIndex: (userId: string, text: string) => Promise<void>
  readEntry: (userId: string, key: string) => Promise<string | null>
  writeEntry: (userId: string, key: string, text: string) => Promise<void>
  removeEntry: (userId: string, key: string) => void
  clearAll: () => void
  /** The user's v2 single-file snapshot, if one is left over (migrated once). */
  readLegacy?: (userId: string) => Promise<string | null>
  removeLegacy?: (userId: string) => void
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
  const legacyFile = (userId: string) =>
    new (fs().File)(fs().Paths.cache, `${LEGACY_V2_PREFIX}${safe(userId)}.json`)
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
    async readLegacy(userId) {
      const target = legacyFile(userId)
      return target.exists ? await target.text() : null
    },
    removeLegacy(userId) {
      const target = legacyFile(userId)
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
  const calledAt = generation
  if (!loading) {
    const startedAt = generation
    loading = (async () => {
      const index = new Map<string, number>()
      let text: string | null = null
      try {
        text = storage ? await storage.readIndex(userId) : null
        const parsed = text ? (JSON.parse(text) as IndexFile) : null
        if (parsed?.userId === userId) {
          for (const [key, savedAt] of Object.entries(parsed.keys)) {
            if (isFresh(savedAt)) index.set(key, savedAt)
          }
        }
      } catch {
        // Corrupt or unreadable index: start empty; the next save replaces it.
      }
      // No index yet: carry over a v2 single-file snapshot from before the update.
      const migrated = text === null ? await readLegacyEntries(userId) : null
      if (startedAt !== generation) return
      const state: Loaded = { userId, index, entries: new Map() }
      loaded = state
      if (migrated) migrateLegacy(state, migrated)
    })().finally(() => {
      loading = null
    })
  }
  await loading
  // A logout / session clear happened meanwhile: never reload the old user's data.
  if (calledAt !== generation) return
  // Another user's load was in flight: load again for this user once.
  if (loaded?.userId !== userId && !loading) {
    if (!retried) await ensureLoaded(userId, true)
  }
}

/**
 * All disk writes run one at a time, in call order, so two saves of the same key can
 * never land out of order. Each task is best effort (disk full / no permission just
 * means no offline copy) and a failure never blocks later tasks: the chain never rejects.
 */
let writes: Promise<void> = Promise.resolve()

function enqueueWrite(task: () => void | Promise<void>): Promise<void> {
  writes = writes.then(async () => {
    try {
      await task()
    } catch {
      // Best effort.
    }
  })
  return writes
}

/** Resolves once queued disk writes have finished (tests). */
export function offlineSnapshotSettled() {
  return writes
}

/**
 * Fresh entries of the user's v2 file, oldest first and capped, or null when there is
 * none (or it is unreadable / another version / another user's).
 */
async function readLegacyEntries(userId: string): Promise<[string, Entry][] | null> {
  if (!storage?.readLegacy) return null
  try {
    const text = await storage.readLegacy(userId)
    if (text === null) return null
    const parsed = JSON.parse(text) as LegacyFile
    if (parsed?.version !== LEGACY_V2_VERSION || parsed.userId !== userId) return []
    return Object.entries(parsed.entries ?? {})
      .filter(([, entry]) => typeof entry?.savedAt === 'number' && isFresh(entry.savedAt))
      .sort(([, a], [, b]) => a.savedAt - b.savedAt)
      .slice(-OFFLINE_MAX_ENTRIES)
  } catch {
    return [] // Corrupt: nothing to keep, but still delete it below.
  }
}

/** Adopt migrated v2 entries in memory, then write them in the v3 layout and drop the v2 file. */
function migrateLegacy(state: Loaded, migrated: [string, Entry][]) {
  for (const [key, entry] of migrated) {
    state.index.set(key, entry.savedAt)
    state.entries.set(key, entry)
  }
  const { userId } = state
  void enqueueWrite(async () => {
    if (!storage || loaded !== state) return
    for (const [key, entry] of migrated) {
      await storage.writeEntry(userId, key, JSON.stringify(entry.data))
    }
    if (loaded !== state) return
    if (migrated.length > 0) {
      const file: IndexFile = { userId, keys: Object.fromEntries(state.index) }
      await storage.writeIndex(userId, JSON.stringify(file))
    }
    // Only once the new copy is on disk, so a failed write keeps the old file for next time.
    storage.removeLegacy?.(userId)
  })
}

/** Remember a successful response for offline reading. The caller decides what to persist. */
export async function offlineSnapshotPut(userId: string, key: string, data: unknown) {
  if (!storage) return
  const calledAt = generation
  await ensureLoaded(userId)
  const state = loaded
  if (calledAt !== generation || !state || state.userId !== userId) return
  const savedAt = Date.now()
  state.index.delete(key)
  state.index.set(key, savedAt)
  state.entries.set(key, { data, savedAt })
  // Map keeps insertion order: drop the least recently saved past the cap.
  const evicted: string[] = []
  while (state.index.size > OFFLINE_MAX_ENTRIES) {
    const oldest = state.index.keys().next().value
    if (oldest === undefined) break
    state.index.delete(oldest)
    state.entries.delete(oldest)
    evicted.push(oldest)
  }
  await enqueueWrite(async () => {
    // Cleared (logout) after this save was queued: write nothing.
    if (!storage || loaded !== state) return
    for (const old of evicted) {
      try {
        storage.removeEntry(userId, old)
      } catch {
        // Already gone.
      }
    }
    // Index only after its entry is on disk, so it never points at a missing write.
    await storage.writeEntry(userId, key, JSON.stringify(data))
    if (loaded !== state) return
    const file: IndexFile = { userId, keys: Object.fromEntries(state.index) }
    await storage.writeIndex(userId, JSON.stringify(file))
  })
}

/** Last saved response for `key`, if any and not too old. */
export async function offlineSnapshotGet(userId: string, key: string): Promise<Entry | undefined> {
  if (!storage) return undefined
  const calledAt = generation
  await ensureLoaded(userId)
  const state = loaded
  if (calledAt !== generation || !state || state.userId !== userId) return undefined
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
  const target = storage
  try {
    target?.clearAll()
  } catch {
    // Nothing to delete / not readable.
  }
  // A native write already in progress can still land after the delete above (queued
  // ones see `loaded` changed and skip): clear once more after it settles. Queued
  // before any write of the next session, so it never deletes the next user's data.
  void enqueueWrite(() => target?.clearAll())
}
