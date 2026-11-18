import { intlLocale } from '@/lib/locale'

/** Extract a list `meta.total` from a settled count/list promise. */
export function totalOf(result: PromiseSettledResult<{ meta: { total: number } }>): number | null {
  return result.status === 'fulfilled' ? result.value.meta.total : null
}

/** Rows from a settled list response, or [] when the request failed. */
export function fulfilledRows<T>(result: PromiseSettledResult<{ data: T[] }>): T[] {
  return result.status === 'fulfilled' ? result.value.data : []
}

/** Dashboard tile display: loading ellipsis, dash on failure, locale number otherwise. */
export function formatCount(value: number | null | undefined, isLoading: boolean): string {
  if (isLoading) return '…'
  return value == null ? '—' : value.toLocaleString(intlLocale())
}
