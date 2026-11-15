import '../../global.css'

import { Stack } from 'expo-router'

import { AppAlertHost } from '@/components/feedback/AppAlertHost'
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary'
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider'
import { usePushNotifications } from '@/hooks/usePushNotifications'
// Bind auth session → API refresh before any feature requests
import '@/stores/authStore'

function PushNotificationsBridge() {
  usePushNotifications()
  return null
}

export default function RootLayout() {
  return (
    <GluestackUIProvider mode="light">
      <ErrorBoundary>
        <PushNotificationsBridge />
        <Stack screenOptions={{ headerShown: false }} />
        <AppAlertHost />
      </ErrorBoundary>
    </GluestackUIProvider>
  )
}
