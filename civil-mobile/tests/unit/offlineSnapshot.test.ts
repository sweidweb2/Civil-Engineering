import {
  OFFLINE_MAX_AGE_MS,
  OFFLINE_MAX_ENTRIES,
  offlineSnapshotClearAll,
  offlineSnapshotGet,
  offlineSnapshotPut,
  offlineSnapshotSettled,
  setOfflineSnapshotStorage,
} from '@/lib/offlineSnapshot'

import { memoryOfflineStorage } from './memoryOfflineStorage'

describe('offline snapshot store', () => {
  let mem: ReturnType<typeof memoryOfflineStorage>
  beforeEach(() => {
    mem = memoryOfflineStorage()
    setOfflineSnapshotStorage(mem.storage)
  })
  afterAll(() => setOfflineSnapshotStorage(null))

  it('saves and reads back a response for the same user after a restart', async () => {
    await offlineSnapshotPut('u1', 'dashboard:pm', { total: 3 })
    await offlineSnapshotSettled()

    // Fresh process: reload from "disk".
    setOfflineSnapshotStorage(mem.storage)
    const hit = await offlineSnapshotGet('u1', 'dashboard:pm')
    expect(hit?.data).toEqual({ total: 3 })
  })

  it('writes only the saved entry plus the index, not every other entry', async () => {
    await offlineSnapshotPut('u1', 'dashboard:pm', { total: 3 })
    await offlineSnapshotPut('u1', 'workers:me', { name: 'A' })
    await offlineSnapshotSettled()
    const writes: string[] = []
    const writeEntry = mem.storage.writeEntry
    mem.storage.writeEntry = async (userId, key, text) => {
      writes.push(key)
      await writeEntry(userId, key, text)
    }

    await offlineSnapshotPut('u1', 'dashboard:pm', { total: 4 })
    expect(writes).toEqual(['dashboard:pm'])
    expect(mem.files.get(mem.entryPath('u1', 'workers:me'))).toBe(JSON.stringify({ name: 'A' }))
  })

  it('never returns another user’s data', async () => {
    await offlineSnapshotPut('u1', 'workers:me', { name: 'A' })
    await offlineSnapshotSettled()
    expect(await offlineSnapshotGet('u2', 'workers:me')).toBeUndefined()
  })

  it('drops entries older than the max age', async () => {
    const now = Date.now()
    mem.files.set(
      mem.indexPath('u1'),
      JSON.stringify({ userId: 'u1', keys: { 'dashboard:pm': now - OFFLINE_MAX_AGE_MS - 1 } }),
    )
    mem.files.set(mem.entryPath('u1', 'dashboard:pm'), '1')
    expect(await offlineSnapshotGet('u1', 'dashboard:pm')).toBeUndefined()
  })

  it('keeps at most OFFLINE_MAX_ENTRIES entries (oldest saved goes first) and deletes evicted files', async () => {
    for (let i = 0; i <= OFFLINE_MAX_ENTRIES; i += 1) {
      await offlineSnapshotPut('u1', `projects:detail-v2:p${i}`, i)
    }
    expect(await offlineSnapshotGet('u1', 'projects:detail-v2:p0')).toBeUndefined()
    expect(mem.files.has(mem.entryPath('u1', 'projects:detail-v2:p0'))).toBe(false)
    expect(
      await offlineSnapshotGet('u1', `projects:detail-v2:p${OFFLINE_MAX_ENTRIES}`),
    ).toBeDefined()
  })

  it('clearAll forgets memory and files (logout)', async () => {
    await offlineSnapshotPut('u1', 'dashboard:pm', 1)
    await offlineSnapshotSettled()
    offlineSnapshotClearAll()
    expect(mem.files.size).toBe(0)
    expect(await offlineSnapshotGet('u1', 'dashboard:pm')).toBeUndefined()
  })

  it('treats a corrupt index as empty and recovers on the next save', async () => {
    mem.files.set(mem.indexPath('u1'), '{not json')
    expect(await offlineSnapshotGet('u1', 'dashboard:pm')).toBeUndefined()
    await offlineSnapshotPut('u1', 'dashboard:pm', 2)
    await offlineSnapshotSettled()
    expect(JSON.parse(mem.files.get(mem.indexPath('u1'))!).keys['dashboard:pm']).toEqual(
      expect.any(Number),
    )
    setOfflineSnapshotStorage(mem.storage)
    expect((await offlineSnapshotGet('u1', 'dashboard:pm'))?.data).toBe(2)
  })

  it('keeps writing after a write throws (one failure never blocks later saves)', async () => {
    const writeIndex = mem.storage.writeIndex
    mem.storage.writeIndex = () => {
      mem.storage.writeIndex = writeIndex
      throw new Error('disk full')
    }
    await offlineSnapshotPut('u1', 'dashboard:pm', 1)
    await offlineSnapshotPut('u1', 'workers:me', 2)
    await offlineSnapshotSettled()
    expect(Object.keys(JSON.parse(mem.files.get(mem.indexPath('u1'))!).keys)).toEqual([
      'dashboard:pm',
      'workers:me',
    ])
  })

  it('lands two saves of the same key in call order', async () => {
    let releaseFirst!: () => void
    const writeEntry = mem.storage.writeEntry
    mem.storage.writeEntry = async (userId, key, text) => {
      if (text === '"old"') await new Promise<void>((resolve) => (releaseFirst = resolve))
      await writeEntry(userId, key, text)
    }
    const first = offlineSnapshotPut('u1', 'dashboard:pm', 'old')
    const second = offlineSnapshotPut('u1', 'dashboard:pm', 'new')
    await new Promise((resolve) => setTimeout(resolve, 0))
    releaseFirst()
    await Promise.all([first, second])
    expect(mem.files.get(mem.entryPath('u1', 'dashboard:pm'))).toBe('"new"')
  })

  it('writes nothing for a save that was still loading when the user logged out', async () => {
    let releaseIndex!: () => void
    const readIndex = mem.storage.readIndex
    mem.storage.readIndex = async (userId) => {
      await new Promise<void>((resolve) => (releaseIndex = resolve))
      return readIndex(userId)
    }
    const put = offlineSnapshotPut('u1', 'dashboard:pm', 'private')
    await new Promise((resolve) => setTimeout(resolve, 0))
    offlineSnapshotClearAll()
    mem.storage.readIndex = readIndex
    releaseIndex()
    await put
    await offlineSnapshotSettled()
    expect(mem.files.size).toBe(0)
  })

  it('removes a write that was already on its way to disk when the user logged out', async () => {
    let releaseWrite!: () => void
    const writeEntry = mem.storage.writeEntry
    mem.storage.writeEntry = async (userId, key, text) => {
      await new Promise<void>((resolve) => (releaseWrite = resolve))
      await writeEntry(userId, key, text) // lands after the first delete
    }
    const put = offlineSnapshotPut('u1', 'dashboard:pm', 'private')
    await new Promise((resolve) => setTimeout(resolve, 0))
    offlineSnapshotClearAll()
    releaseWrite()
    await put
    await offlineSnapshotSettled()
    expect(mem.files.size).toBe(0)
  })

  it('treats a corrupt entry file as missing', async () => {
    await offlineSnapshotPut('u1', 'dashboard:pm', 2)
    await offlineSnapshotSettled()
    mem.files.set(mem.entryPath('u1', 'dashboard:pm'), '{not json')
    setOfflineSnapshotStorage(mem.storage)
    expect(await offlineSnapshotGet('u1', 'dashboard:pm')).toBeUndefined()
  })
})
