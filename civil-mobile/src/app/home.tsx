import { View } from 'react-native'
import { Redirect } from 'expo-router'

import { PageSkeleton } from '@/components/feedback/PageSkeleton'
import { homePathForRole } from '@/navigation'
import { useAuthStore } from '@/stores/authStore'

/** Legacy `/home` → role portal home. */
export default function HomeRedirect() {
  const user = useAuthStore((s) => s.user)
  const isHydrated = useAuthStore((s) => s.isHydrated)

  if (!isHydrated) {
    return (
      <View className="flex-1 bg-background">
        <PageSkeleton label="Loading…" withHeader />
      </View>
    )
  }
  if (!user) return <Redirect href="/login" />

  return <Redirect href={homePathForRole(user.role) as never} />
}
