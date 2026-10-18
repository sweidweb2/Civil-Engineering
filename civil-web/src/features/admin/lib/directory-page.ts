export type DirectoryWindow<T extends string> = {
  source: T
  skip: number
  take: number
}

/** Slice a concatenated directory (materials, then equipment, then workers) without loading every row. */
export function directoryWindows<T extends string>(
  totals: Array<{ source: T; total: number }>,
  offset: number,
  limit: number,
): Array<DirectoryWindow<T>> {
  if (limit <= 0 || offset < 0) return []

  let skipGlobal = offset
  let remaining = limit
  const plan: Array<DirectoryWindow<T>> = []

  for (const entry of totals) {
    if (remaining <= 0) break
    const total = Math.max(0, entry.total)
    if (skipGlobal >= total) {
      skipGlobal -= total
      continue
    }
    const take = Math.min(remaining, total - skipGlobal)
    plan.push({ source: entry.source, skip: skipGlobal, take })
    remaining -= take
    skipGlobal = 0
  }

  return plan
}

/** Read `take` items starting at `skip` using page/limit requests. */
export async function readPageWindow<T>(
  loadPage: (page: number, limit: number) => Promise<T[]>,
  skip: number,
  take: number,
): Promise<T[]> {
  if (take <= 0) return []
  const page = Math.floor(skip / take) + 1
  const inner = skip % take
  const first = await loadPage(page, take)
  let items = first.slice(inner, inner + take)
  if (items.length < take && first.length === take) {
    const second = await loadPage(page + 1, take)
    items = items.concat(second).slice(0, take)
  }
  return items
}
