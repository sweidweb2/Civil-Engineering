import { useEffect, useRef } from 'react'
import { AppState, type AppStateStatus } from 'react-native'

import { useAuthStore } from '@/stores/authStore'

/**
 * Keep the persisted session user in step with the server: once the session is
 * restored from storage, and again whenever the app returns to the foreground.
 * `refreshUser` throttles itself (once a minute), and a login response counts as a
 * fresh read, so this costs at most one small request per foreground. Mount once.
 */
export function useSessionUserSync() {
  const isHydrated = useAuthStore((s) => s.isHydrated)
  const userId = useAuthStore((s) => s.user?.id)
  const previous = useRef<AppStateStatus>(AppState.currentState)

  useEffect(() => {
    if (!isHydrated || !userId) return
    void useAuthStore.getState().refreshUser()
  }, [isHydrated, userId])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      const cameBack = /inactive|background/.test(previous.current) && next === 'active'
      previous.current = next
      if (cameBack) void useAuthStore.getState().refreshUser()
    })
    return () => subscription.remove()
  }, [])
}
