import React from 'react'
import { Text, View } from 'react-native'
import { Plus } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Pressable } from '@/components/ui/pressable'
import { useThemeColors } from '@/hooks/useThemeColors'
import { sizes } from '@/theme/sizes'
import { TYPE } from '@/theme/typography'

export type BottomNavItem = {
  key: string
  label: string
  /** Receives whether the tab is active so the icon can pick its color. */
  renderIcon: (active: boolean) => React.ReactNode
  isActive?: boolean
  onPress?: () => void
}

/** The portal's main create action, shown as an equal column in the middle. */
export type BottomNavAction = {
  label: string
  onPress: () => void
}

type BottomNavigationProps = {
  items: BottomNavItem[]
  action?: BottomNavAction
}

/**
 * Tab bar (section 6.10): docked bottom chrome in `bg` at 94% with a 1px
 * line top rule. Equal columns of 22px line icon + tab label. Active = ink,
 * stroke 1.9, label 600. Inactive = muted-2. No pill, no accent, no glow.
 * The create action is an ordinary column, not a raised button.
 */
export function BottomNavigation({ items, action }: BottomNavigationProps) {
  const insets = useSafeAreaInsets()
  const colors = useThemeColors()
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
        className="min-h-12 min-w-0 flex-1 items-center gap-1 active:opacity-60"
        onPress={item.onPress}
      >
        {item.renderIcon(active)}
        <Text
          className={`${TYPE.tab} ${active ? 'font-semibold text-foreground' : 'text-muted-2'}`}
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
        <Pressable
          key="__action"
          accessibilityRole="button"
          accessibilityLabel={action.label}
          className="min-h-12 min-w-0 flex-1 items-center gap-1 active:opacity-60"
          onPress={action.onPress}
        >
          <Plus size={sizes.iconTab} color={colors.muted2} strokeWidth={sizes.iconStroke} />
          <Text className={`${TYPE.tab} text-muted-2`} numberOfLines={1}>
            {action.label}
          </Text>
        </Pressable>,
      )
    }
    children.push(tab(item))
  })

  return (
    <View
      accessibilityRole="tablist"
      className="flex-row border-t border-border bg-background/95 px-3 pt-2.5"
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}
    >
      {children}
    </View>
  )
}
