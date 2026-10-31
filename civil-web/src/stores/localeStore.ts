import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AppLocale = 'en' | 'ar'

type LocaleState = {
  locale: AppLocale
  isHydrated: boolean
  setHydrated: (value: boolean) => void
  setLocale: (locale: AppLocale) => void
}

export function isAppLocale(value: string): value is AppLocale {
  return value === 'en' || value === 'ar'
}

export function applyDocumentLocale(locale: AppLocale) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = locale
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'
}

/**
 * UI language preference only — not auth/session.
 * Persist key: civil-web-locale
 */
export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: 'en',
      isHydrated: false,
      setHydrated: (value) => set({ isHydrated: value }),
      setLocale: (locale) => {
        applyDocumentLocale(locale)
        set({ locale })
      },
    }),
    {
      name: 'civil-web-locale',
      partialize: (state) => ({ locale: state.locale }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.warn('locale rehydrate failed', error)
        }
        const locale = state?.locale ?? 'en'
        applyDocumentLocale(locale)
        useLocaleStore.setState({ isHydrated: true })
      },
    },
  ),
)

export function useIsRtl(): boolean {
  return useLocaleStore((state) => state.locale === 'ar')
}
