import { Text, View } from 'react-native'
import { Image } from 'expo-image'
import { Package } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import Animated, { FadeInDown } from 'react-native-reanimated'

import { Pressable } from '@/components/ui/pressable'
import { useWorkerPalette } from '@/features/worker/ui/palette'
import { enumLabel } from '@/i18n/labels'
import { REMOTE_IMAGE_CACHE_POLICY, remoteImage } from '@/lib/imageSource'
import { type Category } from '@/services/categories'
import { useLanguageStore } from '@/stores/languageStore'

/** Two-column category card for the directory browse grid. */
export function CategoryGridCard({
  category,
  onPress,
  index = 0,
}: {
  category: Category
  onPress: () => void
  index?: number
}) {
  const { t } = useTranslation()
  const { c, shadow } = useWorkerPalette()
  const isAr = useLanguageStore((s) => s.language) === 'ar'
  const name = (isAr && category.nameAr) || category.name
  const count = category.listingCount ?? 0

  return (
    <Animated.View
      entering={FadeInDown.duration(320).delay(Math.min(index, 8) * 30)}
      className="flex-1"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={name}
        onPress={onPress}
        className="flex-1 overflow-hidden rounded-[20px] bg-wk-sf active:opacity-90"
        style={shadow}
      >
        <View className="aspect-square items-center justify-center overflow-hidden bg-wk-sf2">
          {category.imageUrl ? (
            <Image
              source={remoteImage(category.imageUrl, category.imagePath)}
              style={{ position: 'absolute', inset: 0 }}
              contentFit="cover"
              transition={180}
              cachePolicy={REMOTE_IMAGE_CACHE_POLICY}
              recyclingKey={category.imagePath ?? category.id}
            />
          ) : (
            <View className="size-14 items-center justify-center rounded-[18px] bg-wk-teal-soft">
              <Package size={26} color={c.teal} strokeWidth={1.7} />
            </View>
          )}
        </View>
        <View className="gap-0.5 px-3 pb-3.5 pt-2">
          <View className="flex-row items-start gap-2">
            <Text
              className="min-w-0 flex-1 text-[13px] font-semibold leading-[16px] text-wk-ink"
              numberOfLines={2}
            >
              {name}
            </Text>
            <Text
              className="shrink-0 pt-0.5 text-[11px] leading-[14px] text-wk-ink3"
              numberOfLines={1}
            >
              {enumLabel(t, 'categoryKind', category.kind)}
            </Text>
          </View>
          <Text className="text-[12px] font-medium leading-[15px] text-wk-brand" numberOfLines={1}>
            {t('adminPortal.listingCount', { count })}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  )
}
