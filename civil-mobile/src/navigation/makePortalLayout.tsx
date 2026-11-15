import { Slot, Stack } from 'expo-router'

import { PortalShell } from '@/components/layout/PortalShell'
import { RequireAuth } from '@/features/portals/RequireAuth'
import type { PortalId } from '@/navigation/portalNav'

/**
 * Shared authenticated portal chrome: RequireAuth → PortalShell → Stack or Slot.
 * Use `stack` for nested routes; `slot` for single-screen placeholder portals.
 */
export function makePortalLayout(portal: PortalId, navigator: 'stack' | 'slot' = 'stack') {
  return function PortalLayout() {
    return (
      <RequireAuth portal={portal}>
        <PortalShell portal={portal}>
          {navigator === 'stack' ? <Stack screenOptions={{ headerShown: false }} /> : <Slot />}
        </PortalShell>
      </RequireAuth>
    )
  }
}
