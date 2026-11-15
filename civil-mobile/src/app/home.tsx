import { View } from 'react-native'
import { Redirect } from 'expo-router'

import { IsometricLoader } from '@/components/feedback/IsometricLoader'
import { homePathForRole } from '@/navigation'
import { useAuthStore } from '@/stores/authStore'

/** Legacy `/home` → role portal home. */
export default function HomeRedirect() {
  const user = useAuthStore((s) => s.user)
  const isHydrated = useAuthStore((s) => s.isHydrated)

  if (!isHydrated) {
    return (
      <View className="flex-1 bg-background">
        <IsometricLoader label="Loading…" />
      </View>
    )
  }
  if (!user) return <Redirect href="/login" />

  return <Redirect href={homePathForRole(user.role) as never} />
}
