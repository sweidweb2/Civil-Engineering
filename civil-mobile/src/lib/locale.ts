import { useLanguageStore } from '@/stores/languageStore'

/**
 * BCP 47 tag for `Intl` / `toLocaleString`, following the app language (not the
 * device's). Arabic uses Western digits to match inputs and technical IDs.
 */
export function intlLocale(): string {
  return useLanguageStore.getState().language === 'ar' ? 'ar-u-nu-latn' : 'en-US'
}
