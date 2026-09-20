import { useEffect } from 'react'
import * as Notifications from 'expo-notifications'

import { navigateFromNotificationData, registerPushForUser } from '@/services/notifications'
import { useAuthStore } from '@/stores/authStore'

/**
 * Registers Expo push token when authenticated.
 * Handles notification tap → deep link via `data.path` / `data.url`.
 * Unregister on logout is handled in authStore via `unregisterPushForUser`.
 */
export function usePushNotifications() {
  const user = useAuthStore((s) => s.user)
  const tokens = useAuthStore((s) => s.tokens)
  const isHydrated = useAuthStore((s) => s.isHydrated)

  useEffect(() => {
    if (!isHydrated) return

    if (!user || !tokens?.accessToken) {
      return
    }

    void registerPushForUser(tokens.accessToken)
  }, [isHydrated, user?.id, tokens?.accessToken])

  useEffect(() => {
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown> | undefined
      navigateFromNotificationData(data)
    })

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return
      const data = response.notification.request.content.data as Record<string, unknown> | undefined
      navigateFromNotificationData(data)
    })

    return () => {
      responseSub.remove()
    }
  }, [])
}
