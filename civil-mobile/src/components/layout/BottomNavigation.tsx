import React from 'react'
import { Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Pressable } from '@/components/ui/pressable'
import { useThemeColors } from '@/hooks/useThemeColors'
import { glow, softShadows } from '@/theme/shadows'

export type BottomNavItem = {
  key: string
  label: string
  /** Receives whether the tab is active so the icon can pick its color. */
  renderIcon: (active: boolean) => React.ReactNode
  isActive?: boolean
  onPress?: () => void
}

type BottomNavigationProps = {
  items: BottomNavItem[]
}

/**
 * Floating pill tab bar. The active tab expands into a filled pill with its label.
 * Primary navigation for all mobile portals (via PortalShell).
 */
export function BottomNavigation({ items }: BottomNavigationProps) {
  const insets = useSafeAreaInsets()
  const colors = useThemeColors()

  return (
    <View
      className="bg-background px-5 pt-2"
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}
    >
      <View
        accessibilityRole="tablist"
        className="h-[68px] flex-row items-center justify-between rounded-full border border-border/40 bg-card px-2"
        style={softShadows.float}
      >
        {items.map((item) => {
          const active = Boolean(item.isActive)
          return (
            <Pressable
              key={item.key}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: active }}
              className={`h-14 flex-row items-center justify-center gap-2 rounded-full ${
                active ? 'shrink bg-primary px-4' : 'flex-1'
              }`}
              style={active ? glow(colors.primary, 0.4) : undefined}
              onPress={item.onPress}
            >
              {item.renderIcon(active)}
              {active ? (
                <Text className="text-sm font-bold text-primary-foreground" numberOfLines={1}>
                  {item.label}
                </Text>
              ) : null}
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
