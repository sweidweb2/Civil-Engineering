/**
 * Merge a fetched page into rows accumulated by "Show more".
 * Rows already on screen are replaced in place (a background refetch after an
 * edit must show the new values); unseen rows are appended in server order.
 */
export function mergePageRows<T extends { id: string }>(current: T[], incoming: T[]): T[] {
  const byId = new Map(incoming.map((row) => [row.id, row]))
  const merged = current.map((row) => byId.get(row.id) ?? row)
  const seen = new Set(current.map((row) => row.id))
  return [...merged, ...incoming.filter((row) => !seen.has(row.id))]
}
