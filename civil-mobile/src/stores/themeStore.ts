import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { authStorage } from './authStorage'

export type ThemeMode = 'system' | 'light' | 'dark'

type ThemeState = {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
}

/** The user's appearance choice, remembered on the device. */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'system',
      setMode: (mode) => set({ mode }),
    }),
    {
      name: 'civil-mobile-theme',
      storage: createJSONStorage(() => authStorage),
    },
  ),
)
