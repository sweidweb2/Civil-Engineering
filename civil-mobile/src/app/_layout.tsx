import '../../global.css'
// Bind auth session → API refresh before any feature requests
import '@/i18n'
import '@/stores/authStore'

import { Stack } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { AppAlertHost } from '@/components/feedback/AppAlertHost'
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary'
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider'
import { useConnectivityWatch } from '@/hooks/useConnectivityWatch'
import { useForegroundRevalidate } from '@/hooks/useForegroundRevalidate'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useSessionUserSync } from '@/hooks/useSessionUserSync'
import { useThemeStore } from '@/stores/themeStore'

function PushNotificationsBridge() {
  usePushNotifications()
  return null
}

/**
 * App foreground / session restore: refresh stale data on open screens, and re-read
 * the signed-in user so role or status changes made elsewhere reach this device.
 */
function ForegroundRevalidateBridge() {
  useForegroundRevalidate()
  useSessionUserSync()
  useConnectivityWatch()
  return null
}

export default function RootLayout() {
  const themeMode = useThemeStore((s) => s.mode)
  return (
    <SafeAreaProvider>
      <GluestackUIProvider mode={themeMode}>
        <ErrorBoundary>
          <PushNotificationsBridge />
          <ForegroundRevalidateBridge />
          <Stack screenOptions={{ headerShown: false }} />
          <AppAlertHost />
        </ErrorBoundary>
      </GluestackUIProvider>
    </SafeAreaProvider>
  )
}
