import { Slot } from 'expo-router'

import { PortalShell } from '@/components/layout/PortalShell'
import { RequireAuth } from '@/features/portals/RequireAuth'

export default function AdminLayout() {
  return (
    <RequireAuth portal="admin">
      <PortalShell portal="admin">
        <Slot />
      </PortalShell>
    </RequireAuth>
  )
}
