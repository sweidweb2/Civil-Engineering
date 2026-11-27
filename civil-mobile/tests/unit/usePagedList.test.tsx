import { act, create } from 'react-test-renderer'

import { type PagedList, usePagedList } from '@/components/wk/usePagedList'
import { remoteCacheInvalidate } from '@/lib/remoteCache'

// useRemoteData only reads `tokens` (to allow cache writes); the real store pulls in expo-router.
jest.mock('@/stores/authStore', () => ({
  useAuthStore: { getState: () => ({ tokens: { accessToken: 't', refreshToken: 'r' } }) },
}))

type Row = { id: string }

function page(ids: string[], total = ids.length, pageNum = 1) {
  return { data: ids.map((id) => ({ id })), meta: { total, page: pageNum } }
}

type Options = {
  fetcher: jest.Mock
  resetKey?: string
  enabled?: boolean
}

/** Minimal renderHook on react-test-renderer (RNTL's `test-renderer` peer is not installed). */
async function renderPagedList({ fetcher, resetKey, enabled = true }: Options) {
  const ref: { current: PagedList<Row> | null } = { current: null }
  let renderer: ReturnType<typeof create>
  function Probe({ scope, on }: { scope?: string; on: boolean }) {
    ref.current = usePagedList<Row>({
      fetcher,
      cacheKeyPrefix: 'test:paged',
      resetKey: scope,
      enabled: on,
    })
    return null
  }
  await act(async () => {
    renderer = create(<Probe scope={resetKey} on={enabled} />)
  })
  return {
    list: ref as { current: PagedList<Row> },
    rerender: async (next: { resetKey?: string; enabled?: boolean }) => {
      await act(async () => {
        renderer.update(
          <Probe
            scope={next.resetKey !== undefined ? next.resetKey : resetKey}
            on={next.enabled !== undefined ? next.enabled : enabled}
          />,
        )
      })
    },
  }
}

const ids = (list: PagedList<Row>) => list.rows.map((r) => r.id)

describe('usePagedList.reload', () => {
  beforeEach(() => remoteCacheInvalidate())

  it('refetches page 1 instead of leaving an empty list (approve → reload)', async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce(page(['a', 'b']))
      .mockResolvedValueOnce(page(['b']))

    const { list } = await renderPagedList({ fetcher })
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

describe('usePagedList sticky meta', () => {
  beforeEach(() => remoteCacheInvalidate())

  it('keeps total/hasMore while page 2 is loading', async () => {
    let resolvePage2: (value: ReturnType<typeof page>) => void = () => undefined
    const page2 = new Promise<ReturnType<typeof page>>((resolve) => {
      resolvePage2 = resolve
    })
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce(page(['a', 'b'], 4, 1))
      .mockImplementationOnce(() => page2)

    const { list } = await renderPagedList({ fetcher })
    expect(list.current.total).toBe(4)
    expect(list.current.hasMore).toBe(true)

    await act(async () => {
      list.current.loadMore()
    })

    // Mid-fetch: remote may be loading page 2, but sticky total must remain.
    expect(list.current.total).toBe(4)
    expect(list.current.hasMore).toBe(true)
    expect(ids(list.current)).toEqual(['a', 'b'])

    await act(async () => {
      resolvePage2(page(['c', 'd'], 4, 2))
      await page2
    })

    expect(ids(list.current)).toEqual(['a', 'b', 'c', 'd'])
    expect(list.current.hasMore).toBe(false)
  })
})

describe('usePagedList resetKey / enabled', () => {
  beforeEach(() => remoteCacheInvalidate())

  it('resets to page 1 when resetKey changes', async () => {
    const fetcher = jest
      .fn()
      .mockImplementation(({ page: p }: { page: number }) =>
        Promise.resolve(page(p === 1 ? ['a'] : ['z'], 2, p)),
      )

    const { list, rerender } = await renderPagedList({ fetcher, resetKey: 'cat-1' })
    expect(ids(list.current)).toEqual(['a'])

    await act(async () => {
      list.current.loadMore()
    })
    expect(list.current.page).toBe(2)

    await rerender({ resetKey: 'cat-2' })
    expect(list.current.page).toBe(1)
    expect(ids(list.current)).toEqual(['a'])
    expect(fetcher.mock.calls.some((call) => call[0].page === 1)).toBe(true)
  })

  it('clears rows when enabled becomes false', async () => {
    const fetcher = jest.fn().mockResolvedValue(page(['a', 'b']))
    const { list, rerender } = await renderPagedList({ fetcher, enabled: true })
    expect(ids(list.current)).toEqual(['a', 'b'])

    await rerender({ enabled: false })
    expect(ids(list.current)).toEqual([])
    expect(list.current.total).toBe(0)
  })
})
