import { Text, View } from 'react-native'
import { HardHat } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { WkGridCard } from '@/components/wk/GridCard'
import { useWkPalette } from '@/components/wk/palette'

/** Two-column specialty card for the directory workers browse grid. */
export function SpecialtyGridCard({
  label,
  count,
  onPress,
}: {
  label: string
  count: number
  onPress: () => void
}) {
  const { t } = useTranslation()
  const { c } = useWkPalette()

  return (
    <WkGridCard
      onPress={onPress}
      accessibilityLabel={label}
      mediaAspect="4/3"
      mediaClassName="items-center justify-center"
      media={
        <View className="size-14 items-center justify-center rounded-[18px] bg-wk-brand-soft">
          <HardHat size={26} color={c.brand} strokeWidth={1.7} />
        </View>
      }
    >
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
    </WkGridCard>
  )
}
