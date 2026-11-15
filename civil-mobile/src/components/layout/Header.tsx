import React from 'react'
import { Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type HeaderProps = {
  title: string
  subtitle?: string
  leftSlot?: React.ReactNode
  rightSlot?: React.ReactNode
  className?: string
}

/**
 * Screen header. Top-level screens (no leftSlot) get a large title;
 * pushed screens (with a back button in leftSlot) get a compact bar.
 * Handles the status-bar inset itself.
 */
export function Header({ title, subtitle, leftSlot, rightSlot, className }: HeaderProps) {
  const insets = useSafeAreaInsets()
  const compact = Boolean(leftSlot)

  return (
    <View
      className={`flex-row items-center gap-3 bg-background px-5 pb-3 ${className ?? ''}`}
      style={{ paddingTop: insets.top + (compact ? 8 : 14) }}
    >
      {leftSlot}
      <View className="min-w-0 flex-1">
        <Text
          className={
            compact
              ? 'text-lg font-bold text-foreground'
              : 'text-[28px] font-bold leading-9 text-foreground'
          }
          numberOfLines={1}
          accessibilityRole="header"
        >
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-sm text-muted-foreground" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {rightSlot ? <View className="shrink-0 flex-row items-center gap-2">{rightSlot}</View> : null}
    </View>
  )
}
