import { useCallback, useEffect, useState } from 'react'

const SEARCH_DELAY_MS = 300

/**
 * Shared search box state for admin lists: debounced query and a page index
 * that returns to 1 when the debounced query changes.
 */
export function usePagedQuery() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim())
      setPage(1)
    }, SEARCH_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [query])

  const resetSearch = useCallback(() => {
    setQuery('')
    setDebouncedQuery('')
    setPage(1)
  }, [])

  return { query, setQuery, debouncedQuery, page, setPage, resetSearch }
}
