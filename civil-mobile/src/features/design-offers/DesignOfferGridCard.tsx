import { Text, View } from 'react-native'
import { Image } from 'expo-image'
import { Package } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import Animated, { FadeInDown } from 'react-native-reanimated'

import { Pressable } from '@/components/ui/pressable'
import { useWorkerPalette } from '@/features/worker/ui/palette'
import { REMOTE_IMAGE_CACHE_POLICY, remoteImage } from '@/lib/imageSource'
import { ltr } from '@/lib/rtl'
import { type DesignOffer, formatOfferPrice } from '@/services/design-offers'

/** Two-column catalog card for design offers. */
export function DesignOfferGridCard({
  offer,
  onPress,
  index = 0,
  showInactiveBadge = false,
}: {
  offer: DesignOffer
  onPress: () => void
  index?: number
  showInactiveBadge?: boolean
}) {
  const { t } = useTranslation()
  const { c, shadow } = useWorkerPalette()
  const price = formatOfferPrice(offer)

  return (
    <Animated.View
      entering={FadeInDown.duration(320).delay(Math.min(index, 8) * 30)}
      className="flex-1"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={offer.title}
        onPress={onPress}
        className="flex-1 overflow-hidden rounded-[20px] bg-wk-sf active:opacity-90"
        style={shadow}
      >
        <View className="aspect-square bg-wk-sf2">
          {offer.imageUrl ? (
            <Image
              source={remoteImage(offer.imageUrl, offer.imagePath)}
              style={{ position: 'absolute', inset: 0, opacity: offer.isActive ? 1 : 0.72 }}
              contentFit="cover"
              transition={180}
              cachePolicy={REMOTE_IMAGE_CACHE_POLICY}
              recyclingKey={offer.imagePath ?? offer.id}
            />
          ) : (
            <View className="absolute inset-0 items-center justify-center">
              <Package size={28} color={c.ink3} strokeWidth={1.6} />
            </View>
          )}
          {showInactiveBadge && !offer.isActive ? (
            <View
              className="absolute start-2 top-2 h-6 justify-center rounded-full px-2"
              style={{ backgroundColor: 'rgba(10,12,10,0.62)' }}
            >
              <Text className="text-[11px] font-medium text-white">{t('providerHome.hidden')}</Text>
            </View>
          ) : null}
        </View>
        <View className="gap-1 px-3 pb-3.5 pt-2.5">
          <Text
            className="min-h-[34px] text-[13px] font-semibold leading-[17px] text-wk-ink"
            numberOfLines={2}
          >
            {offer.title}
          </Text>
          <Text className="text-[13px] font-semibold text-wk-brand" numberOfLines={1}>
            {ltr(price)}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  )
}
