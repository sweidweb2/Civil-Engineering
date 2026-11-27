import { Slot, Tabs } from 'expo-router'

import { PortalShell } from '@/components/layout/PortalShell'
import { RequireAuth } from '@/features/portals/RequireAuth'
import { navForPortal, type PortalId } from '@/navigation/portalNav'

/** Expo Router screen name for a portal tab href (`/pm` → `index`, `/pm/projects` → `projects`). */
function tabScreenName(portal: PortalId, href: string): string {
  const root = `/${portal}`
  if (href === root) return 'index'
  const rest = href.startsWith(`${root}/`) ? href.slice(root.length + 1) : href.replace(/^\//, '')
  return rest.split('/')[0] || 'index'
}

/**
 * Shared authenticated portal chrome: RequireAuth → PortalShell → Tabs or Slot.
 * Tabs keep top-level destinations mounted (`lazy: false`, `freezeOnBlur`) so
 * bottom-nav switches do not remount and refetch from scratch.
 */
export function makePortalLayout(portal: PortalId, navigator: 'tabs' | 'slot' = 'tabs') {
  return function PortalLayout() {
    if (navigator === 'slot') {
      return (
        <RequireAuth portal={portal}>
          <PortalShell portal={portal}>
            <Slot />
          </PortalShell>
        </RequireAuth>
      )
    }

    const tabNames = new Set(navForPortal(portal).map((item) => tabScreenName(portal, item.href)))

    return (
      <RequireAuth portal={portal}>
        <PortalShell portal={portal}>
          <Tabs
            tabBar={() => null}
            screenOptions={({ route }) => ({
              headerShown: false,
              freezeOnBlur: true,
              lazy: false,
              // Non-tab routes stay reachable via navigate/push but stay off the bar.
              ...(tabNames.has(route.name) ? {} : { href: null }),
            })}
          />
        </PortalShell>
      </RequireAuth>
    )
  }
}
