import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { AuthTokens, AuthUser } from '@/services/auth'
import * as authApi from '@/services/auth'
import { unregisterPushForUser } from '@/services/notifications'

import { authStorage } from './authStorage'

type AuthState = {
  user: AuthUser | null
  tokens: AuthTokens | null
  isHydrated: boolean
  setHydrated: (value: boolean) => void
  login: (email: string, password: string) => Promise<void>
  register: (input: {
    email: string
    password: string
    firstName?: string
    lastName?: string
  }) => Promise<void>
  logout: () => Promise<void>
}

/**
 * Client auth session only — not an API cache.
 * Persist key + SecureStore: Docs/[3] Decisions/[5] Client State (Zustand).md
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      isHydrated: false,
      setHydrated: (value) => set({ isHydrated: value }),
      async login(email, password) {
        const result = await authApi.login(email, password)
        set({ user: result.user, tokens: result.tokens })
      },
      async register(input) {
        const result = await authApi.register(input)
        set({ user: result.user, tokens: result.tokens })
      },
      async logout() {
        const accessToken = get().tokens?.accessToken
        const refreshToken = get().tokens?.refreshToken
        try {
          await unregisterPushForUser(accessToken)
          if (refreshToken) {
            await authApi.logout(refreshToken)
          }
        } finally {
          set({ user: null, tokens: null })
        }
      },
    }),
    {
      name: 'civil-mobile-auth',
      storage: createJSONStorage(() => authStorage),
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
      }),
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          console.warn('auth rehydrate failed', error)
        }
        // Always clear the gate — including SSR / empty storage / errors
        useAuthStore.setState({ isHydrated: true })
      },
    },
  ),
)

// SSR / first paint safety: never leave the spinner forever
if (typeof window !== 'undefined') {
  queueMicrotask(() => {
    if (!useAuthStore.getState().isHydrated) {
      useAuthStore.setState({ isHydrated: true })
    }
  })
} else {
  useAuthStore.setState({ isHydrated: true })
}
