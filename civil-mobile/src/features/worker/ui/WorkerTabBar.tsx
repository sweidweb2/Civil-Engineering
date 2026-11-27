import { Text, View } from 'react-native'
import type { ReactNode } from 'react'
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import type { BottomNavItem } from '@/components/layout/BottomNavigation'
import { Pressable } from '@/components/ui/pressable'
import { useWkPalette } from '@/components/wk/palette'

const LAYOUT = LinearTransition.springify().damping(18).stiffness(200)

/**
 * Worker-portal tab bar: a floating dark pill. Inactive tabs are icon-only;
 * the active tab grows into a brand-green capsule with its label.
 */
export function WorkerTabBar({
  items,
  renderIcon,
}: {
  items: BottomNavItem[]
  /** Icon for a tab in the given state, colored for the pill. */
  renderIcon: (item: BottomNavItem, color: string) => ReactNode
}) {
  const insets = useSafeAreaInsets()
  const { c, float } = useWkPalette()
  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-0 bottom-0 items-center"
      style={{ paddingBottom: Math.max(insets.bottom, 12) + 10 }}
    >
      <Animated.View
        accessibilityRole="tablist"
        layout={LAYOUT}
        className="flex-row gap-1 rounded-full bg-wk-tab p-1.5"
        style={float}
      >
        {items.map((item) => {
          const active = Boolean(item.isActive)
          return (
            <Animated.View key={item.key} layout={LAYOUT}>
              <Pressable
                accessibilityRole="tab"
                accessibilityLabel={item.label}
                accessibilityState={{ selected: active }}
                onPress={item.onPress}
                className={`h-[50px] min-w-14 flex-row items-center justify-center gap-2 rounded-full ${
                  active ? 'bg-wk-brand px-5' : 'active:opacity-60'
                }`}
              >
                {renderIcon(item, active ? c.onBrand : c.tabInk)}
                {active ? (
                  <Animated.View entering={FadeIn.duration(220)}>
                    <Text className="text-[15px] font-semibold text-wk-on-brand" numberOfLines={1}>
                      {item.label}
                    </Text>
                  </Animated.View>
                ) : null}
              </Pressable>
            </Animated.View>
          )
        })}
      </Animated.View>
    </View>
  )
}
