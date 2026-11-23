import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import { type AppLanguage, useLanguageStore } from '@/stores/languageStore'

import { ar } from './ar'
import { applyDirection, directionNeedsRestart } from './direction'
import { en } from './en'

export { applyDirection, directionNeedsRestart } from './direction'

/**
 * Persist language, apply direction, and reload the native app when RTL/LTR flips.
 * Callers that need confirmation should gate this behind a dialog first.
 */
export async function switchAppLanguage(next: AppLanguage): Promise<void> {
  const needsReload = directionNeedsRestart(next)
  useLanguageStore.getState().setLanguage(next)
  await i18n.changeLanguage(next)
  applyDirection(next)
  if (needsReload) {
    const { reloadAppAsync } = await import('expo')
    await reloadAppAsync()
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
