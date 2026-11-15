import { Slot } from 'expo-router'

import { PortalShell } from '@/components/layout/PortalShell'
import { RequireAuth } from '@/features/portals/RequireAuth'

export default function SuperLayout() {
  return (
    <RequireAuth portal="super">
      <PortalShell portal="super">
        <Slot />
      </PortalShell>
    </RequireAuth>
  )
}
