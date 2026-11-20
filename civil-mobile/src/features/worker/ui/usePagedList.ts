import { useCallback, useEffect, useState } from 'react'

import { useRemoteData } from '@/hooks/useRemoteData'

/**
 * Paged-list data hook behind `WkListScreen`. Kept free of UI imports so it can be
 * unit-tested without native modules; `list.tsx` re-exports it.
 */

/* ─── Data ─────────────────────────────────────────────────────────────── */

export type PageResult<T> = { data: T[]; meta: { total: number; page: number } }

type Fetcher<T> = (args: { page: number; query: string; filter: string }) => Promise<PageResult<T>>

/**
 * Search (debounced), filter and page state, accumulating pages into one
 * array. A new search or filter starts again from page one.
 */
export function usePagedList<T extends { id: string }>({
  fetcher,
  cacheKeyPrefix,
  initialFilter = '',
}: {
  fetcher: Fetcher<T>
  cacheKeyPrefix: string
  initialFilter?: string
}) {
  const [filter, setFilterState] = useState(initialFilter)
  const [query, setQuery] = useState('')
  const [applied, setApplied] = useState('')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<T[]>([])

  const restart = useCallback((next: { filter?: string; applied?: string }) => {
    if (next.filter !== undefined) setFilterState(next.filter)
    if (next.applied !== undefined) setApplied(next.applied)
    setPage(1)
    setRows([])
  }, [])

  useEffect(() => {
    const next = query.trim()
    if (next === applied) return
    const id = setTimeout(() => restart({ applied: next }), 300)
    return () => clearTimeout(id)
  }, [query, applied, restart])

  const load = useCallback(
    () => fetcher({ page, query: applied, filter }),
    // The fetcher is usually an inline arrow; only list params should refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page, applied, filter],
  )
  const remote = useRemoteData(load, {
    cacheKey: `${cacheKeyPrefix}:wk:${page}:${applied}:${filter}`,
  })
  const result = remote.status === 'success' ? remote.data : null

  useEffect(() => {
    if (!result) return
    setRows((current) => {
      if (result.meta.page === 1) return result.data
      const seen = new Set(current.map((r) => r.id))
      return [...current, ...result.data.filter((r) => !seen.has(r.id))]
    })
  }, [result])

  const total = result?.meta.total ?? 0
  return {
    rows,
    total,
    hasResult: Boolean(result),
    query,
    setQuery,
    applied,
    filter,
    setFilter: (next: string) => {
      if (next !== filter) restart({ filter: next })
    },
    clear: () => {
      setQuery('')
      restart({ applied: '' })
    },
    page,
    loadMore: () => setPage((p) => p + 1),
    hasMore: rows.length < total,
    isFirstLoad: remote.isLoading && rows.length === 0,
    isFetching: remote.isFetching,
    error: remote.status === 'error' ? remote.error : undefined,
    refresh: () => (page === 1 ? void remote.refetch() : restart({})),
    /**
     * Re-fetch after a row action (approve, delete…); callers invalidate the cache first.
     * On page 1 the key and loader don't change, so a reset alone would clear the rows
     * without fetching (empty state). Refetch in place instead; later pages restart.
     */
    reload: () => (page === 1 ? void remote.refetch() : restart({})),
  }
}

export type PagedList<T extends { id: string }> = ReturnType<typeof usePagedList<T>>
