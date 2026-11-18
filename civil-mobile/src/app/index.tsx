import { useEffect } from 'react'
import { View } from 'react-native'
import { Redirect } from 'expo-router'

import { PageSkeleton } from '@/components/feedback/PageSkeleton'
import { homePathForRole } from '@/navigation'
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
