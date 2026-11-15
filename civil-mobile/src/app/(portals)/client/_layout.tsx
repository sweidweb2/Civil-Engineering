import { Slot } from 'expo-router'

import { PortalShell } from '@/components/layout/PortalShell'
import { RequireAuth } from '@/features/portals/RequireAuth'

export default function ClientLayout() {
  return (
    <RequireAuth portal="client">
      <PortalShell portal="client">
        <Slot />
      </PortalShell>
    </RequireAuth>
  )
}
