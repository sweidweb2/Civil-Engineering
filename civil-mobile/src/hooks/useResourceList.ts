import { useCallback, useMemo, useRef } from 'react'

import { listView, useListState } from '@/hooks/useListState'
import { useRemoteData } from '@/hooks/useRemoteData'

type PagedResult<T> = { data: T[]; meta: { total: number } }

type ResourceListFetcher<T> = (args: {
  page: number
  query: string
  filter: string
}) => Promise<PagedResult<T>>

type UseResourceListOptions = {
  pageSize?: number
  initialFilter?: string
  enabled?: boolean
  /** Prefix for the remote cache key; page/query/filter are appended. */
  cacheKeyPrefix?: string
}

/**
 * Wires search/filter/page state + remote fetch + ListScreen-ready props.
 * Pass a stable fetcher (or one that closes over stable inputs); list params
 * are supplied by this hook.
 */
export function useResourceList<T>(
  fetcher: ResourceListFetcher<T>,
  options: UseResourceListOptions = {},
) {
  const pageSize = options.pageSize ?? 20
  const list = useListState(options.initialFilter)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const load = useCallback(
    () =>
      fetcherRef.current({
        page: list.page,
        query: list.appliedQuery,
        filter: list.filter,
      }),
    [list.appliedQuery, list.filter, list.page],
  )

  const cacheKey = options.cacheKeyPrefix
    ? `${options.cacheKeyPrefix}:${list.page}:${list.appliedQuery}:${list.filter}`
    : undefined

  const remote = useRemoteData(load, { enabled: options.enabled, cacheKey })
  const view = listView(remote, pageSize)
  const { refetch, isFetching } = remote

  const onRefresh = useCallback(() => {
    void refetch()
  }, [refetch])

  const listProps = useMemo(
    () => ({
      query: list.query,
      onQueryChange: list.setQuery,
      onSearch: list.onSearch,
      filterValue: list.filter,
      onFilterChange: list.onFilter,
      data: view.rows,
      isInitialLoading: view.isInitialLoading,
      isRefreshing: view.isRefreshing || (isFetching && view.rows.length > 0),
      error: view.error,
      onRefresh,
      page: list.page,
      totalPages: view.totalPages,
      onPageChange: list.setPage,
    }),
    [
      list.query,
      list.setQuery,
      list.onSearch,
      list.filter,
      list.onFilter,
      list.page,
      list.setPage,
      view.rows,
      view.isInitialLoading,
      view.isRefreshing,
      view.error,
      view.totalPages,
      onRefresh,
      isFetching,
    ],
  )

  return {
    list,
    remote,
    view,
    pageSize,
    /** Spread onto `ListScreen` for the shared list wiring. */
    listProps,
  }
}
