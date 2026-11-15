import { Slot } from 'expo-router'

import { PortalShell } from '@/components/layout/PortalShell'
import { RequireAuth } from '@/features/portals/RequireAuth'

export default function WorkerLayout() {
  return (
    <RequireAuth portal="worker">
      <PortalShell portal="worker">
        <Slot />
      </PortalShell>
    </RequireAuth>
  )
}
