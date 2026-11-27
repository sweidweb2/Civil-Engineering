import { useCallback, useEffect, useState } from 'react'

import { useRemoteData } from '@/hooks/useRemoteData'
import { hasMorePages, mergePageRows } from '@/lib/pagedRows'

/**
 * Paged-list data hook behind `WkListScreen` / photo grids. Kept free of UI
 * imports so it can be unit-tested without native modules; `list.tsx` re-exports it.
 */

/* ─── Data ─────────────────────────────────────────────────────────────── */

export type PageResult<T> = {
  data: T[]
  meta: { total: number; page: number } & Record<string, unknown>
}

type Fetcher<T> = (args: { page: number; query: string; filter: string }) => Promise<PageResult<T>>

type PageMeta = PageResult<{ id: string }>['meta']

/**
 * Search (debounced), filter and page state, accumulating pages into one
 * array. A new search or filter starts again from page one.
 */
export function usePagedList<T extends { id: string }>({
  fetcher,
  cacheKeyPrefix,
  initialFilter = '',
  enabled = true,
  resetKey,
}: {
  fetcher: Fetcher<T>
  cacheKeyPrefix: string
  initialFilter?: string
  /** When false, skip fetches (e.g. waiting on a route param). */
  enabled?: boolean
  /** When this changes, clear rows and restart at page 1 (categoryId, role…). */
  resetKey?: string
}) {
  const [filter, setFilterState] = useState(initialFilter)
  const [query, setQuery] = useState('')
  const [applied, setApplied] = useState('')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<T[]>([])
  /** Last successful meta — kept while a later page is loading so totals/hasMore stay stable. */
  const [stickyMeta, setStickyMeta] = useState<PageMeta | null>(null)
  const [scopeKey, setScopeKey] = useState(resetKey)
  const [wasEnabled, setWasEnabled] = useState(enabled)

  // Sync scope before fetch: React discards this render and restarts with page 1.
  if (resetKey !== scopeKey) {
    setScopeKey(resetKey)
    setPage(1)
    setRows([])
    setStickyMeta(null)
  }

  // Drop stale rows when the screen disables fetching (missing route param…).
  if (wasEnabled !== enabled) {
    setWasEnabled(enabled)
    if (!enabled) {
      setPage(1)
      setRows([])
      setStickyMeta(null)
    }
  }

  const restart = useCallback((next: { filter?: string; applied?: string }) => {
    if (next.filter !== undefined) setFilterState(next.filter)
    if (next.applied !== undefined) setApplied(next.applied)
    setPage(1)
    setRows([])
    setStickyMeta(null)
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
    [page, applied, filter, resetKey],
  )
  const remote = useRemoteData(load, {
    enabled,
    cacheKey: `${cacheKeyPrefix}:wk:${page}:${applied}:${filter}`,
  })
  const result = remote.status === 'success' ? remote.data : null

  useEffect(() => {
    if (!result) return
    setStickyMeta(result.meta)
    setRows((current) => {
      if (result.meta.page === 1) return result.data
      return mergePageRows(current, result.data)
    })
  }, [result])

  const total = stickyMeta?.total ?? 0
  const hasMore = hasMorePages(rows.length, total) || (remote.status === 'error' && rows.length > 0)

  return {
    rows,
    total,
    meta: stickyMeta ?? undefined,
    hasResult: stickyMeta != null || Boolean(result),
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
    /** Clear search + set filter (e.g. back to ALL). */
    clearAll: (nextFilter = '') => {
      setQuery('')
      restart({ applied: '', filter: nextFilter })
    },
    page,
    /**
     * Advance to the next page, or retry the current page when the last load-more
     * failed — never skip a failed page by bumping the counter again.
     */
    loadMore: () => {
      if (remote.isFetching) return
      if (remote.status === 'error') {
        void remote.refetch()
        return
      }
      setPage((p) => p + 1)
    },
    hasMore,
    isFirstLoad: remote.isLoading && rows.length === 0,
    isFetching: remote.isFetching,
    error: remote.status === 'error' ? remote.error : undefined,
    status: remote.status,
    /** Pull-to-refresh; resolves `false` if page 1 failed but old rows stayed. */
    refresh: () => (page === 1 ? remote.refetch() : restart({})),
    /**
     * Re-fetch after a row action (approve, delete…); callers invalidate the cache first.
     * On page 1 the key and loader don't change, so a reset alone would clear the rows
     * without fetching (empty state). Refetch in place instead; later pages restart.
     */
    reload: () => (page === 1 ? void remote.refetch() : restart({})),
    refetch: () => remote.refetch(),
    restart,
  }
}

export type PagedList<T extends { id: string }> = ReturnType<typeof usePagedList<T>>
