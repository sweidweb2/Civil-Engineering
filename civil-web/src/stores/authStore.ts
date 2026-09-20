import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { AuthTokens, AuthUser } from '@/services/auth'
import * as authApi from '@/services/auth'

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
        const refreshToken = get().tokens?.refreshToken
        try {
          if (refreshToken) {
            await authApi.logout(refreshToken)
          }
        } finally {
          set({ user: null, tokens: null })
        }
      },
    }),
    {
      name: 'civil-web-auth',
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true)
      },
    }
  )
)
