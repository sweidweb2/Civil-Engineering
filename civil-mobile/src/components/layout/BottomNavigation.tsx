import React from 'react'
import { Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Pressable } from '@/components/ui/pressable'

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

  return (
    <View
      className="bg-background px-5 pt-2"
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}
    >
      <View
        accessibilityRole="tablist"
        className="h-16 flex-row items-center justify-between rounded-full border border-border/60 bg-card px-2 shadow-lg"
      >
        {items.map((item) => {
          const active = Boolean(item.isActive)
          return (
            <Pressable
              key={item.key}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: active }}
              className={`h-12 flex-row items-center justify-center gap-2 rounded-full ${
                active ? 'bg-primary px-4' : 'flex-1'
              }`}
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
