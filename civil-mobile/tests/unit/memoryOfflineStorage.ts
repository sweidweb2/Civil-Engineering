import type { OfflineSnapshotStorage } from '@/lib/offlineSnapshot'

/** In-memory `OfflineSnapshotStorage`: `files` maps `<userId>/<name>` to file text. */
export function memoryOfflineStorage() {
  const files = new Map<string, string>()
  const entryPath = (userId: string, key: string) => `${userId}/entry:${key}`
  const indexPath = (userId: string) => `${userId}/index`
  /** The pre-v3 single file (`offline-snapshot-v2-<userId>.json`). */
  const legacyPath = (userId: string) => `legacy-v2:${userId}`
  const storage: OfflineSnapshotStorage = {
    readIndex: async (userId) => files.get(indexPath(userId)) ?? null,
    writeIndex: async (userId, text) => void files.set(indexPath(userId), text),
    readEntry: async (userId, key) => files.get(entryPath(userId, key)) ?? null,
    writeEntry: async (userId, key, text) => void files.set(entryPath(userId, key), text),
    removeEntry: (userId, key) => void files.delete(entryPath(userId, key)),
    clearAll: () => files.clear(),
    readLegacy: async (userId) => files.get(legacyPath(userId)) ?? null,
    removeLegacy: (userId) => void files.delete(legacyPath(userId)),
  }
  return { storage, files, entryPath, indexPath, legacyPath }
}
