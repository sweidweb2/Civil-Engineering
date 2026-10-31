import { useMemo } from 'react'

import { toDateFnsLocale, toIntlLocale } from '@/lib/locale'
import { useLocaleStore } from '@/stores/localeStore'

type DateInput = string | Date | null | undefined

function toValidDate(value: DateInput): Date | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Locale-aware date/number formatting driven by the persisted UI locale. */
export function useLocaleFormat() {
  const locale = useLocaleStore((state) => state.locale)

  return useMemo(() => {
    const intlLocale = toIntlLocale(locale)
    return {
      locale,
      intlLocale,
      dateFnsLocale: toDateFnsLocale(locale),
      formatDate: (value: DateInput, fallback = '—') => {
        const date = toValidDate(value)
        return date ? date.toLocaleDateString(intlLocale) : fallback
      },
      formatDateTime: (value: DateInput, fallback = '—') => {
        const date = toValidDate(value)
        return date ? date.toLocaleString(intlLocale) : fallback
      },
      formatShortDay: (date: Date) =>
        date.toLocaleDateString(intlLocale, { month: 'short', day: '2-digit' }),
      formatNumber: (value: number, options?: Intl.NumberFormatOptions) =>
        new Intl.NumberFormat(intlLocale, options).format(value),
    }
  }, [locale])
}
