import '../../global.css'

import { Stack } from 'expo-router'

import { ErrorBoundary } from '@/components/feedback/ErrorBoundary'
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider'
import { usePushNotifications } from '@/hooks/usePushNotifications'

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
      </ErrorBoundary>
    </GluestackUIProvider>
  )
}
