import { useState } from 'react'

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
