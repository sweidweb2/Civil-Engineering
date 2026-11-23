import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { authStorage } from './authStorage'

export type AppLanguage = 'en' | 'ar'

type LanguageState = {
  language: AppLanguage
  setLanguage: (language: AppLanguage) => void
}

/**
 * Persisted UI language. Drives i18next strings and I18nManager direction
 * (see `src/i18n/index.ts`). First launch may be seeded from the device locale
 * via `seedLanguageFromDevice()` in the root layout.
 */
export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'en',
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'civil-mobile-language',
      storage: createJSONStorage(() => authStorage),
    },
  ),
)

const LANGUAGE_STORAGE_KEY = 'civil-mobile-language'

/**
 * On first launch (nothing saved yet), pick Arabic when the device locale is `ar`.
 * Safe to call once from root layout; no-ops when a choice is already persisted.
 */
export async function seedLanguageFromDevice(): Promise<void> {
  try {
    const raw = await authStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (raw != null && raw !== '') return
    const { getLocales } = await import('expo-localization')
    const language: AppLanguage = getLocales()[0]?.languageCode === 'ar' ? 'ar' : 'en'
    if (language !== useLanguageStore.getState().language) {
      useLanguageStore.getState().setLanguage(language)
    }
  } catch {
    // Keep the default English if localization is unavailable (tests, web edge cases).
  }
}
