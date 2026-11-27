import { Text, View } from 'react-native'
import { Image } from 'expo-image'
import { Package } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { WkGridCard } from '@/components/wk/GridCard'
import { useWkPalette } from '@/components/wk/palette'
import { REMOTE_IMAGE_CACHE_POLICY, remoteImage } from '@/lib/imageSource'
import { ltr } from '@/lib/rtl'
import { type DesignOffer, formatOfferPrice } from '@/services/design-offers'

/** Two-column catalog card for design offers. */
export function DesignOfferGridCard({
  offer,
  onPress,
  showInactiveBadge = false,
}: {
  offer: DesignOffer
  onPress: () => void
  showInactiveBadge?: boolean
}) {
  const { t } = useTranslation()
  const { c } = useWkPalette()
  const price = formatOfferPrice(offer)

  return (
    <WkGridCard
      onPress={onPress}
      accessibilityLabel={offer.title}
      media={
        <>
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
        </>
      }
    >
      <Text
        className="min-h-[34px] text-[13px] font-semibold leading-[17px] text-wk-ink"
        numberOfLines={2}
      >
        {offer.title}
      </Text>
      <Text className="text-[13px] font-semibold text-wk-brand" numberOfLines={1}>
        {ltr(price)}
      </Text>
    </WkGridCard>
  )
}
