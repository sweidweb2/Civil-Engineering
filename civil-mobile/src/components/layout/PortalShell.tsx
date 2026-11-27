import React, { useMemo, useState } from 'react'
import { View } from 'react-native'
import { router, usePathname } from 'expo-router'
import { FolderKanban, Store, UserPlus } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { OfflineBanner } from '@/components/feedback/OfflineBanner'
import { MenuGroup, MenuRow } from '@/components/kit/primitives'
import { BottomSheet } from '@/components/kit/sheet'
import {
  type BottomNavAction,
  BottomNavigation,
  type BottomNavItem,
} from '@/components/layout/BottomNavigation'
import { WorkerTabBar } from '@/features/worker/ui/WorkerTabBar'
import { useThemeColors } from '@/hooks/useThemeColors'
import {
  ADMIN_MORE_LINKS,
  isNavItemActive,
  navForPortal,
  type PortalId,
  type PortalNavItem,
} from '@/navigation'
import { sizes } from '@/theme/sizes'

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
  const [createOpen, setCreateOpen] = useState(false)

  const action: BottomNavAction | undefined = useMemo(() => {
    const go = (href: string) => () => router.push(href as never)
    switch (portal) {
      case 'admin':
        return { label: t('common.create'), onPress: () => setCreateOpen(true) }
      case 'pm':
        return { label: t('pmHome.newProject'), onPress: go('/pm/projects/new') }
      case 'provider':
        return { label: t('providerHome.newListing'), onPress: go('/provider/listings/new') }
      case 'worker':
        return { label: t('workerHome.addExperience'), onPress: go('/worker/cv/experience/new') }
      default:
        return undefined
    }
  }, [portal, t])

  const isTopLevel = useMemo(() => {
    // Admin's More destinations are pushed screens with their own back header.
    return nav.some((item) => item.href === pathname)
  }, [nav, pathname])

  const items: BottomNavItem[] = useMemo(
    () =>
      nav.map((item) => {
        const Icon = item.icon
        return {
          key: item.key,
          label: t(`nav.${item.key}`, { defaultValue: item.label }),
          isActive: tabIsActive(portal, pathname, item),
          renderIcon: (active: boolean) => (
            <Icon
              size={sizes.iconTab}
              strokeWidth={active ? sizes.iconStrokeActive : sizes.iconStroke}
              color={active ? themeColors.ink : themeColors.muted2}
            />
          ),
          onPress: () => {
            if (pathname !== item.href) {
              // Tabs navigator keeps screens mounted; navigate jumps without remount.
              router.navigate(item.href as never)
            }
          },
        }
      }),
    [nav, pathname, portal, themeColors, t],
  )

  // Worker, provider, PM and admin portals use the green palette and a floating pill tab bar.
  const isWorker =
    portal === 'worker' || portal === 'provider' || portal === 'pm' || portal === 'admin'

  return (
    <View className={`flex-1 ${isWorker ? 'bg-wk-bg' : 'bg-background'}`}>
      <View className="min-h-0 w-full max-w-[720px] flex-1 self-center">
        <View className="min-h-0 flex-1">{children}</View>
        <OfflineBanner />
        {isTopLevel && isWorker ? (
          <WorkerTabBar
            items={items}
            renderIcon={(item, color) => {
              const Icon = nav.find((n) => n.key === item.key)?.icon
              return Icon ? <Icon size={20} strokeWidth={2} color={color} /> : null
            }}
          />
        ) : isTopLevel ? (
          <BottomNavigation items={items} action={action} />
        ) : null}
        {portal === 'admin' ? (
          <BottomSheet
            visible={createOpen}
            onClose={() => setCreateOpen(false)}
            title={t('common.create')}
          >
            <MenuGroup>
              {[
                { icon: UserPlus, label: t('users.new'), href: '/admin/users/new' },
                { icon: Store, label: t('providers.new'), href: '/admin/providers/new' },
                { icon: FolderKanban, label: t('projects.new'), href: '/admin/projects/new' },
              ].map((item, index, all) => (
                <MenuRow
                  key={item.href}
                  icon={item.icon}
                  label={item.label}
                  last={index === all.length - 1}
                  onPress={() => {
                    setCreateOpen(false)
                    router.push(item.href as never)
                  }}
                />
              ))}
            </MenuGroup>
          </BottomSheet>
        ) : null}
      </View>
    </View>
  )
}
