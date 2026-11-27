import { act, create } from 'react-test-renderer'

import { type PagedList, usePagedList } from '@/components/wk/usePagedList'
import { offlineSnapshotSettled, setOfflineSnapshotStorage } from '@/lib/offlineSnapshot'
import { remoteCacheInvalidate } from '@/lib/remoteCache'

import { memoryOfflineStorage } from './memoryOfflineStorage'

jest.mock('@/stores/authStore', () => ({
  useAuthStore: {
    getState: () => ({ user: { id: 'u1' }, tokens: { accessToken: 't', refreshToken: 'r' } }),
  },
}))

type Row = { id: string }

const page = (pageNum: number) => ({
  data: [{ id: `p${pageNum}` }],
  meta: { total: 3, page: pageNum },
})

/** Offline-saved cache keys, read from the memory index. */
function savedKeys(mem: ReturnType<typeof memoryOfflineStorage>) {
  const text = mem.files.get(mem.indexPath('u1'))
  return text ? Object.keys((JSON.parse(text) as { keys: Record<string, number> }).keys) : []
}

async function render(persist: boolean) {
  const ref: { current: PagedList<Row> | null } = { current: null }
  const fetcher = jest.fn(async ({ page: n }: { page: number }) => page(n))
  function Probe() {
    ref.current = usePagedList<Row>({ fetcher, cacheKeyPrefix: 'projects:list:cards', persist })
    return null
  }
  await act(async () => {
    create(<Probe />)
  })
  return ref as { current: PagedList<Row> }
}

describe('usePagedList persist', () => {
  let mem: ReturnType<typeof memoryOfflineStorage>
  beforeEach(() => {
    mem = memoryOfflineStorage()
    setOfflineSnapshotStorage(mem.storage)
    remoteCacheInvalidate()
  })
  afterAll(() => setOfflineSnapshotStorage(null))

  it('saves page 1 without a search, but not later pages or searches', async () => {
    const list = await render(true)
    await act(async () => list.current.loadMore())
    await act(async () => list.current.setQuery('cement'))
    await act(async () => new Promise((resolve) => setTimeout(resolve, 350)))
    await offlineSnapshotSettled()

    expect(savedKeys(mem)).toEqual(['projects:list:cards:wk:1::'])
  })

  it('saves nothing without persist', async () => {
    await render(false)
    await offlineSnapshotSettled()
    expect(savedKeys(mem)).toEqual([])
  })
})
