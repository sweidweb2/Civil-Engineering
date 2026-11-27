import {
  flushOfflineSnapshot,
  isPersistableKey,
  OFFLINE_MAX_AGE_MS,
  OFFLINE_MAX_ENTRIES,
  offlineSnapshotClearAll,
  offlineSnapshotGet,
  offlineSnapshotPut,
  type OfflineSnapshotStorage,
  setOfflineSnapshotStorage,
} from '@/lib/offlineSnapshot'

function memoryStorage() {
  const files = new Map<string, string>()
  const storage: OfflineSnapshotStorage = {
    read: async (userId) => files.get(userId) ?? null,
    write: (userId, text) => void files.set(userId, text),
    clearAll: () => files.clear(),
  }
  return { storage, files }
}

describe('isPersistableKey', () => {
  it.each([
    'dashboard:pm',
    'workers:me',
    'providers:me',
    'projects:detail-v2:p1',
    'projects:list:summary',
    'projects:list:/pm/projects:cards:1::ALL',
    'listings:mine:grid:all:1::ACTIVE',
    'listings:detail:l1:view',
    'directory:list:pm:categories:',
    'directory:list:pm:specialty-counts:',
  ])('saves own working data: %s', (key) => expect(isPersistableKey(key)).toBe(true))

  it.each([
    'users:list:wk:1::', // other people's accounts (admin)
    'queue:list:wk:1::pending',
    'listings:mine:grid:all:2::ALL', // later pages
    'listings:mine:grid:all:1:cement:ALL', // searches
    'listings:detail:l1:edit',
    'directory:list:pm:categories:bob', // searched directory
    'directory:list:pm:specialty-counts:bob',
    'projects:detail:p1', // pre-v2 bare-project shape
    'projects:stages:p1', // stage-only keys no longer written
  ])('does not save: %s', (key) => expect(isPersistableKey(key)).toBe(false))
})

describe('offline snapshot store', () => {
  let mem: ReturnType<typeof memoryStorage>
  beforeEach(() => {
    mem = memoryStorage()
    setOfflineSnapshotStorage(mem.storage)
  })
  afterAll(() => setOfflineSnapshotStorage(null))

  it('saves and reads back a response for the same user, and writes one file per user', async () => {
    await offlineSnapshotPut('u1', 'dashboard:pm', { total: 3 })
    flushOfflineSnapshot()
    expect(mem.files.has('u1')).toBe(true)

    // Fresh process: reload from "disk".
    setOfflineSnapshotStorage(mem.storage)
    const hit = await offlineSnapshotGet('u1', 'dashboard:pm')
    expect(hit?.data).toEqual({ total: 3 })
  })

  it('never returns another user’s data', async () => {
    await offlineSnapshotPut('u1', 'workers:me', { name: 'A' })
    flushOfflineSnapshot()
    expect(await offlineSnapshotGet('u2', 'workers:me')).toBeUndefined()
  })

  it('ignores keys that are not allow-listed', async () => {
    await offlineSnapshotPut('u1', 'users:list:wk:1::', [{ id: 'x' }])
    flushOfflineSnapshot()
    expect(mem.files.size).toBe(0)
  })

  it('drops entries older than the max age', async () => {
    const now = Date.now()
    mem.files.set(
      'u1',
      JSON.stringify({
        version: 1,
        userId: 'u1',
        entries: { 'dashboard:pm': { data: 1, savedAt: now - OFFLINE_MAX_AGE_MS - 1 } },
      }),
    )
    expect(await offlineSnapshotGet('u1', 'dashboard:pm')).toBeUndefined()
  })

  it('keeps at most OFFLINE_MAX_ENTRIES entries (oldest saved goes first)', async () => {
    for (let i = 0; i <= OFFLINE_MAX_ENTRIES; i += 1) {
      await offlineSnapshotPut('u1', `projects:detail-v2:p${i}`, i)
    }
    expect(await offlineSnapshotGet('u1', 'projects:detail-v2:p0')).toBeUndefined()
    expect(
      await offlineSnapshotGet('u1', `projects:detail-v2:p${OFFLINE_MAX_ENTRIES}`),
    ).toBeDefined()
  })

  it('clearAll forgets memory and files (logout)', async () => {
    await offlineSnapshotPut('u1', 'dashboard:pm', 1)
    flushOfflineSnapshot()
    offlineSnapshotClearAll()
    expect(mem.files.size).toBe(0)
    expect(await offlineSnapshotGet('u1', 'dashboard:pm')).toBeUndefined()
  })

  it('treats a corrupt file as empty', async () => {
    mem.files.set('u1', '{not json')
    expect(await offlineSnapshotGet('u1', 'dashboard:pm')).toBeUndefined()
    await offlineSnapshotPut('u1', 'dashboard:pm', 2)
    flushOfflineSnapshot()
    expect(JSON.parse(mem.files.get('u1')!).entries['dashboard:pm'].data).toBe(2)
  })
})
