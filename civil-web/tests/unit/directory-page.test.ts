import { describe, expect, it } from 'vitest'

import { directoryWindows, readPageWindow } from '@/features/admin/lib/directory-page'

describe('directoryWindows', () => {
  const totals = [
    { source: 'materials' as const, total: 10 },
    { source: 'equipment' as const, total: 10 },
    { source: 'workers' as const, total: 5 },
  ]

  it('takes the first page from the first source', () => {
    expect(directoryWindows(totals, 0, 8)).toEqual([{ source: 'materials', skip: 8 * 0, take: 8 }])
  })

  it('continues into the next source when a page crosses the boundary', () => {
    expect(directoryWindows(totals, 8, 8)).toEqual([
      { source: 'materials', skip: 8, take: 2 },
      { source: 'equipment', skip: 0, take: 6 },
    ])
  })

  it('returns nothing past the end', () => {
    expect(directoryWindows(totals, 25, 8)).toEqual([])
  })
})

describe('readPageWindow', () => {
  const rows = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']

  it('reads a window that starts mid-page', async () => {
    const items = await readPageWindow(async (page, limit) => {
      const start = (page - 1) * limit
      return rows.slice(start, start + limit)
    }, 6, 4)
    expect(items).toEqual(['g', 'h', 'i', 'j'])
  })

  it('spans two pages when the skip is not aligned', async () => {
    const items = await readPageWindow(async (page, limit) => {
      const start = (page - 1) * limit
      return rows.slice(start, start + limit)
    }, 2, 4)
    expect(items).toEqual(['c', 'd', 'e', 'f'])
  })
})
