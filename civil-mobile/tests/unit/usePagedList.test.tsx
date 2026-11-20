import { act, create } from 'react-test-renderer'

import { type PagedList, usePagedList } from '@/features/worker/ui/usePagedList'
import { remoteCacheInvalidate } from '@/lib/remoteCache'

// useRemoteData only reads `tokens` (to allow cache writes); the real store pulls in expo-router.
jest.mock('@/stores/authStore', () => ({
  useAuthStore: { getState: () => ({ tokens: { accessToken: 't', refreshToken: 'r' } }) },
}))

type Row = { id: string }

function page(ids: string[]) {
  return { data: ids.map((id) => ({ id })), meta: { total: ids.length, page: 1 } }
}

/** Minimal renderHook on react-test-renderer (RNTL's `test-renderer` peer is not installed). */
async function renderPagedList(fetcher: jest.Mock) {
  const ref: { current: PagedList<Row> | null } = { current: null }
  function Probe() {
    ref.current = usePagedList<Row>({ fetcher, cacheKeyPrefix: 'test:paged' })
    return null
  }
  await act(async () => {
    create(<Probe />)
  })
  return ref as { current: PagedList<Row> }
}

const ids = (list: PagedList<Row>) => list.rows.map((r) => r.id)

describe('usePagedList.reload', () => {
  beforeEach(() => remoteCacheInvalidate())

  it('refetches page 1 instead of leaving an empty list (approve → reload)', async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce(page(['a', 'b']))
      .mockResolvedValueOnce(page(['b']))

    const list = await renderPagedList(fetcher)
    expect(ids(list.current)).toEqual(['a', 'b'])

    // Screens invalidate, then reload after a row action (e.g. approving "a").
    await act(async () => {
      remoteCacheInvalidate('test:paged')
      list.current.reload()
    })

    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(ids(list.current)).toEqual(['b'])
  })
})
