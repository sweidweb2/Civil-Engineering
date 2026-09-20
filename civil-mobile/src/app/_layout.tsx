import '../../global.css'

import { Stack } from 'expo-router'

import { ErrorBoundary } from '@/components/feedback/ErrorBoundary'
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider'

export default function RootLayout() {
  return (
    <GluestackUIProvider mode="light">
      <ErrorBoundary>
        <Stack screenOptions={{ headerShown: false }} />
      </ErrorBoundary>
    </GluestackUIProvider>
  )
}
