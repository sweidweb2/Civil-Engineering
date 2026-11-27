/**
 * Soft cap for rows kept in memory after repeated "Show more" taps.
 * FlatList still virtualizes the viewport; this bounds the JS heap / cache fan-out.
 */
export const MAX_PAGED_ROWS = 150

/**
 * Merge a fetched page into rows accumulated by "Show more".
 * Rows already on screen are replaced in place (a background refetch after an
 * edit must show the new values); unseen rows are appended in server order.
 * Result length is capped at `maxRows` (earliest pages kept).
 */
export function mergePageRows<T extends { id: string }>(
  current: T[],
  incoming: T[],
  maxRows = MAX_PAGED_ROWS,
): T[] {
  const byId = new Map(incoming.map((row) => [row.id, row]))
  const merged = current.map((row) => byId.get(row.id) ?? row)
  const seen = new Set(current.map((row) => row.id))
  const next = [...merged, ...incoming.filter((row) => !seen.has(row.id))]
  return next.length <= maxRows ? next : next.slice(0, maxRows)
}

/** True when more pages exist on the server and the in-memory cap has room. */
export function hasMorePages(rowCount: number, total: number, maxRows = MAX_PAGED_ROWS) {
  return rowCount < total && rowCount < maxRows
}
