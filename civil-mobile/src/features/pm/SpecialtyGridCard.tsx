import { Text, View } from 'react-native'
import { HardHat } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import Animated, { FadeInDown } from 'react-native-reanimated'

import { Pressable } from '@/components/ui/pressable'
import { useWorkerPalette } from '@/features/worker/ui/palette'

/** Two-column specialty card for the directory workers browse grid. */
export function SpecialtyGridCard({
  label,
  count,
  onPress,
  index = 0,
}: {
  label: string
  count: number
  onPress: () => void
  index?: number
}) {
  const { t } = useTranslation()
  const { c, shadow } = useWorkerPalette()

  return (
    <Animated.View
      entering={FadeInDown.duration(320).delay(Math.min(index, 8) * 30)}
      className="flex-1"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        className="flex-1 overflow-hidden rounded-[20px] bg-wk-sf active:opacity-90"
        style={shadow}
      >
        <View className="aspect-[4/3] items-center justify-center bg-wk-sf2">
          <View className="size-14 items-center justify-center rounded-[18px] bg-wk-brand-soft">
            <HardHat size={26} color={c.brand} strokeWidth={1.7} />
          </View>
        </View>
        <View className="gap-1 px-3 pb-3.5 pt-2.5">
          <Text
            className="min-h-[34px] text-[13px] font-semibold leading-[17px] text-wk-ink"
            numberOfLines={2}
          >
            {label}
          </Text>
          <Text className="text-[11px] text-wk-ink3" numberOfLines={1}>
            {t('worker.specialty')}
          </Text>
          <Text className="text-[12px] font-medium text-wk-brand" numberOfLines={1}>
            {t('pmPortal.workerCount', { count })}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  )
}
