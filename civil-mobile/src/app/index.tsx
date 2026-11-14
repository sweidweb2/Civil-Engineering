import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { Redirect } from 'expo-router'

import { useAuthStore } from '@/stores/authStore'

export default function Index() {
  const user = useAuthStore((s) => s.user)
  const isHydrated = useAuthStore((s) => s.isHydrated)
  const setHydrated = useAuthStore((s) => s.setHydrated)

  useEffect(() => {
    // Fallback if persist callback never fires on web
    const t = setTimeout(() => setHydrated(true), 50)
    return () => clearTimeout(t)
  }, [setHydrated])

  if (!isHydrated) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    )
  }

  if (user) {
    return <Redirect href="/home" />
  }

  return <Redirect href="/login" />
}
