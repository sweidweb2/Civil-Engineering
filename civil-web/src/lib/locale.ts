import type { Locale } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'

import { type AppLocale, useLocaleStore } from '@/stores/localeStore'

/**
 * `en` → `en-US`, `ar` → `ar-u-nu-latn` (BCP 47 tag for `Intl` / `toLocale*String`).
 * Arabic month/day names, Western digits: matches inputs, tables and technical IDs.
 */
export function toIntlLocale(locale: AppLocale): string {
  return locale === 'ar' ? 'ar-u-nu-latn' : 'en-US'
}

/** Date + time in the app language, for module-level helpers that cannot use hooks. */
export function formatDateTimeInAppLocale(value: string | number | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  return date.toLocaleString(toIntlLocale(useLocaleStore.getState().locale))
}

export function toDateFnsLocale(locale: AppLocale): Locale {
  return locale === 'ar' ? ar : enUS
}
