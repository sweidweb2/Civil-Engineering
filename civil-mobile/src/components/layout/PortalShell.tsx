import React, { useMemo } from 'react'
import { View } from 'react-native'
import { router, usePathname } from 'expo-router'

import { BottomNavigation, type BottomNavItem } from '@/components/layout/BottomNavigation'
import {
  ADMIN_MORE_LINKS,
  isNavItemActive,
  navForPortal,
  type PortalId,
  type PortalNavItem,
} from '@/navigation'
import { colors } from '@/theme/colors'

type PortalShellProps = {
  portal: PortalId
  children: React.ReactNode
}

function tabIsActive(portal: PortalId, pathname: string, item: PortalNavItem): boolean {
  if (isNavItemActive(pathname, item)) return true
  // Admin "More" stays highlighted on overflow destinations.
  if (portal === 'admin' && item.key === 'more') {
    return ADMIN_MORE_LINKS.some((link) => isNavItemActive(pathname, link))
  }
  return false
}

/**
 * Authenticated portal chrome: screen content + role bottom tab bar.
 * All mobile portals use this instead of a sidebar.
 */
export function PortalShell({ portal, children }: PortalShellProps) {
  const pathname = usePathname()
  const nav = navForPortal(portal)

  const items: BottomNavItem[] = useMemo(
    () =>
      nav.map((item) => {
        const active = tabIsActive(portal, pathname, item)
        const Icon = item.icon
        return {
          key: item.key,
          label: item.label,
          isActive: active,
          icon: <Icon size={22} color={active ? colors.light.primary : colors.light.textMuted} />,
          onPress: () => {
            if (pathname !== item.href) {
              // Tabs replace so bottom-nav switches do not pile history.
              router.replace(item.href as never)
            }
          },
        }
      }),
    [nav, pathname, portal],
  )

  return (
    <View className="flex-1 bg-background">
      <View className="min-h-0 flex-1">{children}</View>
      <BottomNavigation items={items} />
    </View>
  )
}
