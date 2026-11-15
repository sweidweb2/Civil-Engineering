import { Stack } from 'expo-router'

import { PortalShell } from '@/components/layout/PortalShell'
import { RequireAuth } from '@/features/portals/RequireAuth'

export default function ProviderLayout() {
  return (
    <RequireAuth portal="provider">
      <PortalShell portal="provider">
        <Stack screenOptions={{ headerShown: false }} />
      </PortalShell>
    </RequireAuth>
  )
}
