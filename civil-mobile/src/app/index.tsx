import { View } from 'react-native'
import { Redirect } from 'expo-router'

import { PageSkeleton } from '@/components/feedback/PageSkeleton'
import { homePathForRole } from '@/navigation'
import { useAuthStore } from '@/stores/authStore'

export default function Index() {
  const user = useAuthStore((s) => s.user)
  const isHydrated = useAuthStore((s) => s.isHydrated)
  // Hydration fallbacks (web microtask, native safety timeout) live in authStore. A short
  // timer here used to open the gate before SecureStore finished on native, flashing Login.

  if (!isHydrated) {
    return (
      <View className="flex-1 bg-background">
        <PageSkeleton label="Loading…" withHeader />
      </View>
    )
  }

  if (user) {
    return <Redirect href={homePathForRole(user.role) as never} />
  }

  return <Redirect href="/login" />
}
