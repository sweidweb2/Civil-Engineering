import { type ReactElement, type ReactNode, useCallback } from 'react'
import { FlatList, type FlatListProps, type ListRenderItemInfo, View } from 'react-native'

import { Pressable } from '@/components/ui/pressable'
import { LIST_PERF } from '@/lib/listPerf'

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

/** 12px gap between list rows. Module-level so FlatList never remounts separators. */
export function WkListGap() {
  return <View className="h-3" />
}

/** Half-width cells with a 6px inner gutter: a 12px column gap, and a lone last card keeps its width. */
const CELL_START = { width: '50%', paddingEnd: 6 } as const
const CELL_END = { width: '50%', paddingStart: 6 } as const

const idOf = (item: { id: string }) => item.id

type WkGridProps<T> = Omit<
  FlatListProps<T>,
  'data' | 'renderItem' | 'numColumns' | 'keyExtractor' | 'columnWrapperStyle'
> & {
  data: readonly T[]
  /**
   * One card. Keep it stable (`useCallback`): with a stable renderer, cells skip
   * re-rendering when only the header (search text, filters) changes.
   */
  renderCard: (item: T) => ReactElement
}

/** Two-column portal grid (listings, categories, users…) with the shared list tuning. */
export function WkGrid<T extends { id: string }>({ data, renderCard, ...rest }: WkGridProps<T>) {
  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<T>) => (
      <View style={index % 2 === 0 ? CELL_START : CELL_END}>{renderCard(item)}</View>
    ),
    [renderCard],
  )
  return (
    <FlatList
      data={data}
      numColumns={2}
      keyExtractor={idOf}
      renderItem={renderItem}
      ItemSeparatorComponent={WkListGap}
      {...LIST_PERF}
      {...rest}
    />
  )
}
