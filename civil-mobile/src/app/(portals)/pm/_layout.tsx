import { Slot } from 'expo-router'

import { PortalShell } from '@/components/layout/PortalShell'
import { RequireAuth } from '@/features/portals/RequireAuth'

export default function PmLayout() {
  return (
    <RequireAuth portal="pm">
      <PortalShell portal="pm">
        <Slot />
      </PortalShell>
    </RequireAuth>
  )
}
