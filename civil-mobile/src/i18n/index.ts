import { I18nManager, Platform } from 'react-native'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import { type AppLanguage, useLanguageStore } from '@/stores/languageStore'

import { ar } from './ar'
import { en } from './en'

function isRtl(language: AppLanguage): boolean {
  return language === 'ar'
}

/** True when the native layout direction only changes after an app restart. */
export function directionNeedsRestart(language: AppLanguage): boolean {
  return Platform.OS !== 'web' && I18nManager.isRTL !== isRtl(language)
}

function applyDirection(language: AppLanguage) {
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

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ar: { translation: ar } },
  lng: useLanguageStore.getState().language,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
})
applyDirection(useLanguageStore.getState().language)

// Follows the saved choice, including when it finishes loading from storage.
useLanguageStore.subscribe((state) => {
  void i18n.changeLanguage(state.language)
  applyDirection(state.language)
})

export default i18n
