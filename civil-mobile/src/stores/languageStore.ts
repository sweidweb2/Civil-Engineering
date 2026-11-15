import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { authStorage } from './authStorage'

export type AppLanguage = 'en' | 'ar'

type LanguageState = {
  language: AppLanguage
  setLanguage: (language: AppLanguage) => void
}

/**
 * The user's language choice, remembered on the device.
 * Nothing reads it for translation yet: the mobile app has no translation files.
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
