import { Platform } from 'react-native'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { offlineSnapshotClearAll } from '@/lib/offlineSnapshot'
import { remoteCacheGeneration, remoteCacheInvalidate } from '@/lib/remoteCache'
import { ApiError, bindAuthSession } from '@/services/api'
import type { AuthTokens, AuthUser } from '@/services/auth'
import * as authApi from '@/services/auth'
import { unregisterPushForUser } from '@/services/notifications'
import { getUser, type User } from '@/services/users'

import { authStorage } from './authStorage'

type AuthState = {
  user: AuthUser | null
  tokens: AuthTokens | null
  isHydrated: boolean
  setHydrated: (value: boolean) => void
  setTokens: (tokens: AuthTokens) => void
  clearSession: () => void
  login: (email: string, password: string) => Promise<void>
  register: (input: {
    email: string
    password: string
    firstName?: string
    lastName?: string
    role: authApi.RegisterRole
  }) => Promise<{ pendingApproval: boolean }>
  logout: () => Promise<void>
  /**
   * Re-read the signed-in user (role, status, verification, names) from the server.
   * The persisted `user` is otherwise only set at login, so an admin's role change or
   * a profile edit made elsewhere would never reach this device. Throttled to once per
   * `USER_SYNC_INTERVAL_MS` unless `force`.
   */
  refreshUser: (options?: { force?: boolean }) => Promise<void>
  /** Epoch ms of the last server read of `user` (memory only, not persisted). */
  lastUserSyncAt: number
}

/** Native safety net for a hung SecureStore read; cleared once rehydration finishes. */
let hydrationSafetyTimer: ReturnType<typeof setTimeout> | undefined

/** Minimum gap between automatic user re-reads (startup / app foreground). */
export const USER_SYNC_INTERVAL_MS = 60_000

/** Keep only the session summary fields the app routes on (same shape as login). */
export function authUserFrom(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    isVerified: user.isVerified,
    profile: user.profile
      ? {
          firstName: user.profile.firstName,
          lastName: user.profile.lastName,
          displayName: user.profile.displayName,
        }
      : null,
  }
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
      lastUserSyncAt: 0,
      setHydrated: (value) => set({ isHydrated: value }),
      setTokens: (tokens) => set({ tokens }),
      clearSession: () => {
        remoteCacheInvalidate()
        offlineSnapshotClearAll()
        set({ user: null, tokens: null })
      },
      async login(email, password) {
        remoteCacheInvalidate()
        offlineSnapshotClearAll()
        const result = await authApi.login(email, password)
        set({ user: result.user, tokens: result.tokens, lastUserSyncAt: Date.now() })
      },
      async register(input) {
        remoteCacheInvalidate()
        const result = await authApi.register(input)
        if (result.pendingApproval || !result.tokens) {
          set({ user: null, tokens: null })
          return { pendingApproval: true }
        }
        set({ user: result.user, tokens: result.tokens, lastUserSyncAt: Date.now() })
        return { pendingApproval: false }
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
          remoteCacheInvalidate()
          // Saved offline copies are personal data: never leave them for the next user.
          offlineSnapshotClearAll()
          set({ user: null, tokens: null })
        }
      },
      async refreshUser(options) {
        const { user, tokens, lastUserSyncAt } = get()
        if (!user || !tokens) return
        if (!options?.force && Date.now() - lastUserSyncAt < USER_SYNC_INTERVAL_MS) return
        set({ lastUserSyncAt: Date.now() })
        const generation = remoteCacheGeneration()
        try {
          const { data } = await getUser(user.id)
          // Logged out / switched account while the request was in flight.
          if (remoteCacheGeneration() !== generation || get().user?.id !== user.id) return
          const next = authUserFrom(data)
          const current = get().user
          if (JSON.stringify(current) === JSON.stringify(next)) return
          if (current && current.role !== next.role) {
            // Cached data belongs to the old portal; RequireAuth redirects to the new one.
            remoteCacheInvalidate()
          }
          set({ user: next })
        } catch (error) {
          // 404: the account was deleted. Suspension / pending → 401 → the API client
          // fails the token refresh and clears the session. Network errors: keep the
          // stored user and try again next time.
          if (error instanceof ApiError && error.status === 404) {
            await get()
              .logout()
              .catch(() => undefined)
          } else {
            set({ lastUserSyncAt: 0 })
          }
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
        clearTimeout(hydrationSafetyTimer)
        useAuthStore.setState({ isHydrated: true })
      },
    },
  ),
)

bindAuthSession({
  getAccessToken: () => useAuthStore.getState().tokens?.accessToken,
  getRefreshToken: () => useAuthStore.getState().tokens?.refreshToken,
  setTokens: (tokens) => useAuthStore.getState().setTokens(tokens),
  clearSession: () => useAuthStore.getState().clearSession(),
})

// Never leave the launch spinner forever.
// Native: wait for `onRehydrateStorage` (SecureStore is async). Opening the gate on the
// next microtask, as before, ran *before* the read finished (React Native defines
// `window`), so a saved session briefly looked logged-out. Keep a long safety net only.
// Web / SSR: localStorage resolves immediately, keep the microtask fallback.
/** Longer than a typical SecureStore read; still caps a hung rehydrate spinner. */
export const NATIVE_HYDRATION_TIMEOUT_MS = 8_000

function openHydrationGate() {
  if (!useAuthStore.getState().isHydrated) {
    useAuthStore.setState({ isHydrated: true })
  }
}

if (Platform.OS !== 'web') {
  hydrationSafetyTimer = setTimeout(openHydrationGate, NATIVE_HYDRATION_TIMEOUT_MS)
} else if (typeof window !== 'undefined') {
  queueMicrotask(openHydrationGate)
} else {
  useAuthStore.setState({ isHydrated: true })
}
