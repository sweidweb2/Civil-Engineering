import { Redirect } from 'expo-router'

import { homePathForRole } from '@/navigation'
import { useAuthStore } from '@/stores/authStore'

/** @deprecated Prefer portal routes; kept for any lingering imports. */
export function HomeScreen() {
  const user = useAuthStore((s) => s.user)
  const isHydrated = useAuthStore((s) => s.isHydrated)

  if (!isHydrated) return null
  if (!user) return <Redirect href="/login" />

  return <Redirect href={homePathForRole(user.role) as never} />
}
