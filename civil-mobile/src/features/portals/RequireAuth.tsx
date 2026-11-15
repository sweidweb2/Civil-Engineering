import { View } from 'react-native'
import { Redirect } from 'expo-router'

import { IsometricLoader } from '@/components/feedback/IsometricLoader'
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
        <IsometricLoader label="Loading…" />
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
