import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { SkeletonBlock } from '@/components/kit/primitives'
import { sizes } from '@/theme/sizes'
import { spacing } from '@/theme/spacing'

/**
 * Loading state for a whole page: skeletons in the shape of the real layout
 * (hero number block, context line, a grouped list). Never a spinner.
 *
 * `withHeader` adds the safe-area gap and a title block, for screens that
 * have not drawn their own header yet (app boot, auth gate).
 */
export function PageSkeleton({
  label,
  withHeader = false,
}: {
  label?: string
  withHeader?: boolean
}) {
  const insets = useSafeAreaInsets()
  return (
    <View
      className="flex-1 gap-7 bg-background px-5"
      style={{ paddingTop: withHeader ? insets.top + spacing.top : spacing.stack }}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
    >
      {withHeader ? (
        <View className="gap-2">
          <SkeletonBlock className="h-3 w-32 rounded-sm" />
          <SkeletonBlock className="h-5 w-44 rounded-sm" />
        </View>
      ) : null}
      <View className="gap-3">
        <SkeletonBlock className="h-3 w-28 rounded-sm" />
        {/* Hero number placeholder (design system: 160 × 48). */}
        <View style={{ width: sizes.heroSkeletonW, height: sizes.heroSkeletonH }}>
          <SkeletonBlock className="h-full w-full rounded-sm" />
        </View>
        <SkeletonBlock className="h-3 w-52 rounded-sm" />
      </View>
      <View className="overflow-hidden rounded-lg border border-border bg-card">
        {[0, 1, 2, 3].map((index) => (
          <View
            key={index}
            className={`flex-row items-center gap-3 px-4 py-3.5 ${
              index < 3 ? 'border-b border-line-subtle' : ''
            }`}
          >
            <SkeletonBlock className="size-10 rounded-full" />
            <View className="flex-1 gap-2">
              <SkeletonBlock className="h-3.5 w-3/5 rounded-sm" />
              <SkeletonBlock className="h-3 w-2/5 rounded-sm" />
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}
