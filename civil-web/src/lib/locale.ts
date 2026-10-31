import type { Locale } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'

import type { AppLocale } from '@/stores/localeStore'

/** `en` → `en-US`, `ar` → `ar` (BCP 47 tag for `Intl` / `toLocale*String`). */
export function toIntlLocale(locale: AppLocale): string {
  return locale === 'ar' ? 'ar' : 'en-US'
}

export function toDateFnsLocale(locale: AppLocale): Locale {
  return locale === 'ar' ? ar : enUS
}
