import React from 'react'
import { Text, View } from 'react-native'
import { Plus } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { PressableScale } from '@/components/kit/primitives'
import { Pressable } from '@/components/ui/pressable'
import { useThemeColors } from '@/hooks/useThemeColors'
import { glow } from '@/theme/shadows'

export type BottomNavItem = {
  key: string
  label: string
  /** Receives whether the tab is active so the icon can pick its color. */
  renderIcon: (active: boolean) => React.ReactNode
  isActive?: boolean
  onPress?: () => void
}

/** Raised round "+" button shown in the middle of the bar. */
export type BottomNavAction = {
  label: string
  onPress: () => void
}

type BottomNavigationProps = {
  items: BottomNavItem[]
  action?: BottomNavAction
}

/**
 * Docked tab bar: full width, hairline top border, every tab shows icon +
 * label (active in primary). An optional raised "+" sits in the middle for the
 * portal's main create action. Primary navigation for all mobile portals.
 */
export function BottomNavigation({ items, action }: BottomNavigationProps) {
  const insets = useSafeAreaInsets()
  const colors = useThemeColors()
  // A centred "+" only works with an even tab count (equal tabs each side).
  const showAction = Boolean(action) && items.length % 2 === 0
  const mid = items.length / 2

  const tab = (item: BottomNavItem) => {
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
  }

  const children: React.ReactNode[] = []
  items.forEach((item, index) => {
    if (action && showAction && index === mid) {
      children.push(
        <View key="__action" className="w-16 items-center">
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={action.label}
            scaleTo={0.9}
            className="-mt-7 size-14 items-center justify-center rounded-full border-4 border-card bg-primary"
            style={glow(colors.primary, 0.45)}
            onPress={action.onPress}
          >
            <Plus size={26} color={colors.onPrimary} strokeWidth={2.6} />
          </PressableScale>
        </View>,
      )
    }
    children.push(tab(item))
  })

  return (
    <View
      accessibilityRole="tablist"
      className="flex-row border-t border-border/60 bg-card px-2 pt-2"
      style={{ paddingBottom: Math.max(insets.bottom, 8) }}
    >
      {children}
    </View>
  )
}
