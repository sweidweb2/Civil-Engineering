import { Redirect } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'

import { useAuthStore } from '@/stores/authStore'

export default function Index() {
  const user = useAuthStore((s) => s.user)
  const isHydrated = useAuthStore((s) => s.isHydrated)

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
