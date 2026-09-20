import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { AuthTokens, AuthUser } from '@/services/auth'
import * as authApi from '@/services/auth'

const memoryStore = new Map<string, string>()

const secureStorage = {
  getItem: async (name: string) => {
    if (Platform.OS === 'web') {
      return memoryStore.get(name) ?? localStorage.getItem(name)
    }
    return SecureStore.getItemAsync(name)
  },
  setItem: async (name: string, value: string) => {
    if (Platform.OS === 'web') {
      memoryStore.set(name, value)
      localStorage.setItem(name, value)
      return
    }
    await SecureStore.setItemAsync(name, value)
  },
  removeItem: async (name: string) => {
    if (Platform.OS === 'web') {
      memoryStore.delete(name)
      localStorage.removeItem(name)
      return
    }
    await SecureStore.deleteItemAsync(name)
  },
}

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
      name: 'civil-mobile-auth',
      storage: createJSONStorage(() => secureStorage),
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
