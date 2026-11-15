import '../../global.css'
// Bind auth session → API refresh before any feature requests
import '@/stores/authStore'

import { Stack } from 'expo-router'

import { AppAlertHost } from '@/components/feedback/AppAlertHost'
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary'
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider'
import { usePushNotifications } from '@/hooks/usePushNotifications'

function PushNotificationsBridge() {
  usePushNotifications()
  return null
}

export default function RootLayout() {
  return (
    <GluestackUIProvider mode="system">
      <ErrorBoundary>
        <PushNotificationsBridge />
        <Stack screenOptions={{ headerShown: false }} />
        <AppAlertHost />
      </ErrorBoundary>
    </GluestackUIProvider>
  )
}
