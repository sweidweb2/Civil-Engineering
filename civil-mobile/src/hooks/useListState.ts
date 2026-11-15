import { useState } from 'react'

import type { RemoteState } from '@/hooks/useRemoteData'

/** Search text, applied query, filter and page for a paged list screen. */
export function useListState(initialFilter = '') {
  const [query, setQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [filter, setFilter] = useState(initialFilter)
  const [page, setPage] = useState(1)

  return {
    query,
    setQuery,
    appliedQuery,
    filter,
    page,
    setPage,
    onSearch: (next: string) => {
      setPage(1)
      setAppliedQuery(next)
    },
    onFilter: (next: string) => {
      setPage(1)
      setFilter(next)
    },
  }
}

type PagedResult<T> = { data: T[]; meta: { total: number } }

/** Derives the rows and loading flags a ListScreen needs from a remote page. */
export function listView<T>(
  remote: RemoteState<PagedResult<T>> & { isLoading: boolean },
  pageSize: number,
) {
  const hasData = remote.status === 'success'
  const total = hasData ? remote.data.meta.total : 0
  return {
    rows: hasData ? remote.data.data : [],
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    isInitialLoading: remote.isLoading && !hasData,
    isRefreshing: hasData && remote.isLoading,
    error: remote.status === 'error' ? remote.error : undefined,
  }
}
