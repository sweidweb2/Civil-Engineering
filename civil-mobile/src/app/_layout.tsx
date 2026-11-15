import '../../global.css'
// Bind auth session → API refresh before any feature requests
import '@/i18n'
import '@/stores/authStore'

import { Stack } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { AppAlertHost } from '@/components/feedback/AppAlertHost'
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary'
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useThemeStore } from '@/stores/themeStore'

function PushNotificationsBridge() {
  usePushNotifications()
  return null
}

export default function RootLayout() {
  const themeMode = useThemeStore((s) => s.mode)
  return (
    <SafeAreaProvider>
      <GluestackUIProvider mode={themeMode}>
        <ErrorBoundary>
          <PushNotificationsBridge />
          <Stack screenOptions={{ headerShown: false }} />
          <AppAlertHost />
        </ErrorBoundary>
      </GluestackUIProvider>
    </SafeAreaProvider>
  )
}
