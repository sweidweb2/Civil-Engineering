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
 * Docked tab bar: full width, hairline top border, every tab shows icon +
 * label, the active one in the primary color. Primary navigation for all
 * mobile portals (via PortalShell).
 */
export function BottomNavigation({ items }: BottomNavigationProps) {
  const insets = useSafeAreaInsets()

  return (
    <View
      accessibilityRole="tablist"
      className="flex-row border-t border-border/60 bg-card px-2 pt-2"
      style={{ paddingBottom: Math.max(insets.bottom, 8) }}
    >
      {items.map((item) => {
        const active = Boolean(item.isActive)
        return (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: active }}
            className="min-w-0 flex-1 items-center gap-1 py-1 active:opacity-70"
            onPress={item.onPress}
          >
            {item.renderIcon(active)}
            <Text
              className={`text-[11px] ${
                active ? 'font-bold text-primary' : 'font-medium text-muted-foreground'
              }`}
              numberOfLines={1}
            >
              {item.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
