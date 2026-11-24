import { useEffect, useRef } from 'react'
import { AppState, type AppStateStatus } from 'react-native'

import { remoteCacheRevalidate } from '@/lib/remoteCache'
import { useAuthStore } from '@/stores/authStore'

/**
 * When the app comes back to the foreground, ask open screens to refetch any
 * cached data that is no longer fresh. Fresh data (< staleTime) costs nothing,
 * so a quick app switch makes no requests. Mount once, in the root layout.
 */
export function useForegroundRevalidate() {
  const previous = useRef<AppStateStatus>(
    (AppState.currentState as AppStateStatus | null | undefined) ?? 'active',
  )

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      const cameBack = /inactive|background/.test(previous.current) && next === 'active'
      previous.current = next
      if (cameBack && useAuthStore.getState().tokens) remoteCacheRevalidate()
    })
    return () => subscription.remove()
  }, [])
}
