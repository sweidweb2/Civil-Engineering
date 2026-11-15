import React, { useMemo } from 'react'
import { View } from 'react-native'
import { router, usePathname } from 'expo-router'
import { useTranslation } from 'react-i18next'

import { BottomNavigation, type BottomNavItem } from '@/components/layout/BottomNavigation'
import { useThemeColors } from '@/hooks/useThemeColors'
import {
  ADMIN_MORE_LINKS,
  isNavItemActive,
  navForPortal,
  type PortalId,
  type PortalNavItem,
} from '@/navigation'

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
 * The bar shows on top-level destinations only, so detail and form screens
 * get the full height and their own bottom action bar.
 */
export function PortalShell({ portal, children }: PortalShellProps) {
  const { t } = useTranslation()
  const themeColors = useThemeColors()
  const pathname = usePathname()
  const nav = navForPortal(portal)

  const isTopLevel = useMemo(() => {
    const roots = portal === 'admin' ? [...nav, ...ADMIN_MORE_LINKS] : nav
    return roots.some((item) => item.href === pathname)
  }, [nav, pathname, portal])

  const items: BottomNavItem[] = useMemo(
    () =>
      nav.map((item) => {
        const Icon = item.icon
        return {
          key: item.key,
          label: t(`nav.${item.key}`, { defaultValue: item.label }),
          isActive: tabIsActive(portal, pathname, item),
          renderIcon: (active: boolean) => (
            <Icon size={22} color={active ? themeColors.onPrimary : themeColors.textMuted} />
          ),
          onPress: () => {
            if (pathname !== item.href) {
              // Tabs replace so bottom-nav switches do not pile history.
              router.replace(item.href as never)
            }
          },
        }
      }),
    [nav, pathname, portal, themeColors, t],
  )

  return (
    <View className="flex-1 bg-background">
      <View className="min-h-0 w-full max-w-[720px] flex-1 self-center">
        <View className="min-h-0 flex-1">{children}</View>
        {isTopLevel ? <BottomNavigation items={items} /> : null}
      </View>
    </View>
  )
}
