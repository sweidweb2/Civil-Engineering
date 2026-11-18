import { View } from 'react-native'
import { Redirect } from 'expo-router'

import { PageSkeleton } from '@/components/feedback/PageSkeleton'
import { homePathForRole, type PortalId, portalIdForRole } from '@/navigation'
import { useAuthStore } from '@/stores/authStore'

type RequireAuthProps = {
  portal: PortalId
  children: React.ReactNode
}

/**
 * Hydration + session gate. Wrong-role visitors redirect to their portal home.
 */
export function RequireAuth({ portal, children }: RequireAuthProps) {
  const user = useAuthStore((s) => s.user)
  const isHydrated = useAuthStore((s) => s.isHydrated)

  if (!isHydrated) {
    return (
      <View className="flex-1 bg-background">
        <PageSkeleton label="Loading…" withHeader />
      </View>
    )
  }

  if (!user) {
    return <Redirect href="/login" />
  }

  if (portalIdForRole(user.role) !== portal) {
    return <Redirect href={homePathForRole(user.role) as never} />
  }

  return <>{children}</>
}
