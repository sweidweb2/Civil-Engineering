import { formatDateTimeInAppLocale } from '@/lib/locale'

export const CELL_CHAR_LIMIT = 28

export function ellipsis(value: string | null | undefined, max = CELL_CHAR_LIMIT): string {
  if (!value) return '—'
  if (value.length <= max) return value
  return `${value.slice(0, max)}…`
}

export function formatWhen(iso: string): string {
  try {
    return formatDateTimeInAppLocale(iso)
  } catch {
    return iso
  }
}

export const PAGE_SIZE = 8

export function paginate<T>(items: T[], page: number, pageSize = PAGE_SIZE): T[] {
  const start = (page - 1) * pageSize
  return items.slice(start, start + pageSize)
}

export function pageCount(total: number, pageSize = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize))
}
