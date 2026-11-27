import { View } from 'react-native'
import type { ReactNode } from 'react'

import { Pressable } from '@/components/ui/pressable'

import { useWkPalette } from './palette'

type MediaAspect = 'square' | '4/3'

/**
 * Shared chrome for two-column portal grids (listings, categories, users…).
 * Callers supply media + footer content; elevation / radius stay here.
 */
export function WkGridCard({
  onPress,
  accessibilityLabel,
  media,
  mediaAspect = 'square',
  children,
  mediaClassName,
}: {
  onPress: () => void
  accessibilityLabel: string
  media: ReactNode
  mediaAspect?: MediaAspect
  children: ReactNode
  /** Extra classes on the media frame (e.g. justify-center). */
  mediaClassName?: string
}) {
  const { shadow } = useWkPalette()
  const aspectClass = mediaAspect === '4/3' ? 'aspect-[4/3]' : 'aspect-square'

  return (
    <View className="flex-1">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        className="flex-1 overflow-hidden rounded-[20px] bg-wk-sf active:opacity-90"
        style={shadow}
      >
        <View className={`${aspectClass} overflow-hidden bg-wk-sf2 ${mediaClassName ?? ''}`}>
          {media}
        </View>
        <View className="gap-1 px-3 pb-3.5 pt-2.5">{children}</View>
      </Pressable>
    </View>
  )
}

/** One FlatList row: two cards (or one + spacer). */
export function WkGridRow({ children }: { children: ReactNode }) {
  return <View className="flex-row gap-3">{children}</View>
}

/** Spacer that keeps a lone card at half width in a two-column row. */
export function WkGridSpacer() {
  return <View className="flex-1" />
}
