import { I18nManager, Platform } from 'react-native'

import type { AppLanguage } from '@/stores/languageStore'

function isRtl(language: AppLanguage): boolean {
  return language === 'ar'
}

/** True when the native layout direction only changes after an app restart. */
export function directionNeedsRestart(language: AppLanguage): boolean {
  return Platform.OS !== 'web' && I18nManager.isRTL !== isRtl(language)
}

/** Apply document dir/lang (web) or I18nManager forceRTL (native). */
export function applyDirection(language: AppLanguage): void {
  if (Platform.OS === 'web') {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = isRtl(language) ? 'rtl' : 'ltr'
      document.documentElement.lang = language
    }
    return
  }
  if (I18nManager.isRTL !== isRtl(language)) {
    I18nManager.allowRTL(isRtl(language))
    I18nManager.forceRTL(isRtl(language))
  }
}
