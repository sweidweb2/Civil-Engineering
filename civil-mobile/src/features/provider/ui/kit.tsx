import { type ReactNode, useEffect } from 'react'
import { Text, View } from 'react-native'
import { Image } from 'expo-image'
import type { TFunction } from 'i18next'
import { type LucideIcon, Package } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'

import { BottomSheet } from '@/components/kit'
import { Pressable } from '@/components/ui/pressable'
import { useWorkerPalette } from '@/features/worker/ui/palette'
import { enumLabel } from '@/i18n/labels'
import { REMOTE_IMAGE_CACHE_POLICY, remoteImage } from '@/lib/imageSource'
import { intlLocale } from '@/lib/locale'
import { ltr } from '@/lib/rtl'
import type { Listing, ListingStatus } from '@/services/listings'
import { useLanguageStore } from '@/stores/languageStore'

/**
 * Provider-portal pieces from resources/providers/Provider Portal.dc.html.
 * The portal shares the worker palette (`wk-*` tokens / useWorkerPalette);
 * this file only adds what the storefront needs on top: photo cards, the
 * status badge that sits on photos, a photo scrim and listing formatting.
 */

/* ─── Formatting ───────────────────────────────────────────────────────── */

/** "420000.0000" → "420,000". Leaves non-numeric strings untouched. */
export function formatAmount(value: string | null | undefined): string {
  if (value == null || value === '') return ''
  const n = Number(value)
  if (!Number.isFinite(n)) return value
  return n.toLocaleString(intlLocale(), { maximumFractionDigits: 2 })
}

/** Sale price without the unit ("SAR 2,650"), or '' when there is none. */
export function salePrice(listing: Pick<Listing, 'currency' | 'price' | 'priceMin' | 'priceMax'>) {
  const cur = listing.currency?.trim() ?? ''
  if (listing.price) return ltr(`${cur} ${formatAmount(listing.price)}`.trim())
  if (listing.priceMin && listing.priceMax) {
    return ltr(`${cur} ${formatAmount(listing.priceMin)}–${formatAmount(listing.priceMax)}`.trim())
  }
  return ''
}

export function rentPrice(listing: Pick<Listing, 'currency' | 'rentalPrice'>) {
  if (!listing.rentalPrice) return ''
  return ltr(`${listing.currency?.trim() ?? ''} ${formatAmount(listing.rentalPrice)}`.trim())
}

/** One-line card price: rental wins (it is what buyers act on), then sale, else on request. */
export function cardPrice(t: TFunction, listing: Listing): string {
  if (listing.rentalPrice && listing.rentalUnit) {
    return `${rentPrice(listing)} / ${enumLabel(t, 'rentalUnit', listing.rentalUnit).toLowerCase()}`
  }
  const sale = salePrice(listing)
  if (sale) return listing.unit?.trim() ? `${sale} / ${listing.unit.trim()}` : sale
  return t('providerPortal.priceOnRequest')
}

/** Category label in the app language. */
export function useCategoryName() {
  const isAr = useLanguageStore((s) => s.language) === 'ar'
  return (listing: Pick<Listing, 'categoryName' | 'categoryNameAr'>) =>
    (isAr && listing.categoryNameAr) || listing.categoryName || ''
}

/* ─── Status ───────────────────────────────────────────────────────────── */

/** Fixed dot colors: the badge always sits on a dark translucent chip over a photo. */
const PHOTO_DOT: Record<ListingStatus, string> = { ACTIVE: '#4ADE80', INACTIVE: '#B8BCB5' }

export function statusLabel(t: TFunction, status: ListingStatus) {
  return status === 'ACTIVE' ? t('providerHome.live') : t('providerHome.hidden')
}

/** Live / Hidden chip laid over a listing photo. */
export function PhotoStatusBadge({ status, small }: { status: ListingStatus; small?: boolean }) {
  const { t } = useTranslation()
  return (
    <View
      className={`absolute start-2 top-2 flex-row items-center gap-1.5 rounded-full ${
        small ? 'h-6 px-2' : 'h-[26px] px-2.5'
      }`}
      style={{ backgroundColor: 'rgba(10,12,10,0.62)' }}
    >
      <View className="size-1.5 rounded-full" style={{ backgroundColor: PHOTO_DOT[status] }} />
      <Text className={`font-medium text-white ${small ? 'text-[11px]' : 'text-xs'}`}>
        {statusLabel(t, status)}
      </Text>
    </View>
  )
}

/* ─── Photos ───────────────────────────────────────────────────────────── */

/** Listing photo, or a quiet placeholder tile when there is none. */
export function ListingPhoto({
  uri,
  cacheKey,
  dim,
  iconSize = 28,
}: {
  uri?: string | null
  /** Stable image key (`mainImageKey`). */
  cacheKey?: string | null
  /** Hidden listings are shown slightly faded. */
  dim?: boolean
  iconSize?: number
}) {
  const { c } = useWorkerPalette()
  if (!uri) {
    return (
      <View className="absolute inset-0 items-center justify-center bg-wk-sf2">
        <Package size={iconSize} color={c.ink3} strokeWidth={1.6} />
      </View>
    )
  }
  return (
    <Image
      source={remoteImage(uri, cacheKey)}
      style={{ position: 'absolute', inset: 0, opacity: dim ? 0.78 : 1 }}
      contentFit="cover"
      transition={180}
      cachePolicy={REMOTE_IMAGE_CACHE_POLICY}
      recyclingKey={cacheKey ?? uri}
    />
  )
}

/** Vertical dark gradient over a photo so white text stays readable. */
export function PhotoScrim({
  id,
  stops,
}: {
  /** Unique per screen: SVG gradient ids are global on web. */
  id: string
  stops: [offset: number, opacity: number][]
}) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            {stops.map(([offset, opacity]) => (
              <Stop key={offset} offset={offset} stopColor="#06100A" stopOpacity={opacity} />
            ))}
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  )
}

/* ─── Cards ────────────────────────────────────────────────────────────── */

/** Two-column grid card: square photo, two-line name, price, category. */
export function ListingGridCard({
  listing,
  onPress,
  index = 0,
}: {
  listing: Listing
  onPress: () => void
  index?: number
}) {
  const { t } = useTranslation()
  const { shadow } = useWorkerPalette()
  const categoryName = useCategoryName()
  const category = categoryName(listing)
  return (
    <Animated.View
      entering={FadeInDown.duration(320).delay(Math.min(index, 8) * 30)}
      className="flex-1"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${listing.name}, ${statusLabel(t, listing.status)}`}
        onPress={onPress}
        className="flex-1 overflow-hidden rounded-[20px] bg-wk-sf active:opacity-90"
        style={shadow}
      >
        <View className="aspect-square bg-wk-sf2">
          <ListingPhoto
            uri={listing.mainImageUrl}
            cacheKey={listing.mainImageKey}
            dim={listing.status !== 'ACTIVE'}
          />
          <PhotoStatusBadge status={listing.status} small />
          {listing.rentalPrice && listing.rentalUnit ? (
            <View
              className="absolute end-2 top-2 h-6 justify-center rounded-full px-2"
              style={{ backgroundColor: 'rgba(255,255,255,0.92)' }}
            >
              <Text className="text-[11px] font-semibold" style={{ color: '#0A1F12' }}>
                {t('providerPortal.forRent')}
              </Text>
            </View>
          ) : null}
        </View>
        <View className="gap-1 px-3 pb-3.5 pt-2.5">
          <Text
            className="min-h-[34px] text-[13px] font-semibold leading-[17px] text-wk-ink"
            numberOfLines={2}
          >
            {listing.name}
          </Text>
          <Text className="text-[13px] font-semibold text-wk-brand" numberOfLines={1}>
            {cardPrice(t, listing)}
          </Text>
          {category ? (
            <Text className="text-[11px] text-wk-ink3" numberOfLines={1}>
              {category}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  )
}

/** Wide card for the home screen's horizontal "Recent listings" rail. */
export function ListingRailCard({ listing, onPress }: { listing: Listing; onPress: () => void }) {
  const { t } = useTranslation()
  const { shadow } = useWorkerPalette()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={listing.name}
      onPress={onPress}
      className="w-[212px] overflow-hidden rounded-[22px] bg-wk-sf active:opacity-90"
      style={shadow}
    >
      <View className="h-[150px] bg-wk-sf2">
        <ListingPhoto
          uri={listing.mainImageUrl}
          cacheKey={listing.mainImageKey}
          dim={listing.status !== 'ACTIVE'}
        />
        <PhotoStatusBadge status={listing.status} />
      </View>
      <View className="gap-1 px-3.5 pb-3.5 pt-3">
        <Text className="text-[15px] font-semibold leading-5 text-wk-ink" numberOfLines={1}>
          {listing.name}
        </Text>
        <Text className="text-[13px] font-medium text-wk-brand" numberOfLines={1}>
          {cardPrice(t, listing)}
        </Text>
      </View>
    </Pressable>
  )
}

function usePulse() {
  const opacity = useSharedValue(1)
  useEffect(() => {
    opacity.set(withRepeat(withTiming(0.45, { duration: 600 }), -1, true))
  }, [opacity])
  return useAnimatedStyle(() => ({ opacity: opacity.value }))
}

/** Loading placeholder shaped like the two-column grid. */
export function ListingGridSkeleton({ count = 4 }: { count?: number }) {
  const pulse = usePulse()
  const rows = Array.from({ length: Math.ceil(count / 2) }, (_, i) => i)
  return (
    <Animated.View
      style={pulse}
      className="gap-3"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {rows.map((row) => (
        <View key={row} className="flex-row gap-3">
          {[0, 1].map((col) => (
            <View key={col} className="flex-1 overflow-hidden rounded-[20px] bg-wk-sf">
              <View className="aspect-square bg-wk-sf2" />
              <View className="gap-2 p-3">
                <View className="h-3 w-4/5 rounded-md bg-wk-sf2" />
                <View className="h-2.5 w-1/2 rounded bg-wk-sf2" />
              </View>
            </View>
          ))}
        </View>
      ))}
    </Animated.View>
  )
}

/* ─── Option sheet ─────────────────────────────────────────────────────── */

export type PvSheetOption = {
  key: string
  icon: LucideIcon
  label: string
  onPress: () => void
  destructive?: boolean
}

/** Bottom sheet of icon rows (photo source, photo actions, logo). */
export function PvOptionSheet({
  visible,
  title,
  options,
  onClose,
}: {
  visible: boolean
  title: string
  options: PvSheetOption[]
  onClose: () => void
}) {
  const { c } = useWorkerPalette()
  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <View className="pb-2">
        {options.map(({ key, icon: Icon, label, onPress, destructive }) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={onPress}
            className="min-h-14 flex-row items-center gap-3.5 rounded-[14px] px-3 active:bg-wk-sf2"
          >
            <View className="size-9 items-center justify-center rounded-[10px] bg-wk-sf2">
              <Icon size={18} color={destructive ? c.red : c.ink} strokeWidth={1.9} />
            </View>
            <Text
              className={`min-w-0 flex-1 text-[15px] font-medium ${
                destructive ? 'text-wk-red' : 'text-wk-ink'
              }`}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
    </BottomSheet>
  )
}

/** Section heading row with an optional trailing action ("Recent listings · See all"). */
export function PvSectionHead({
  label,
  action,
}: {
  label: ReactNode
  action?: { label: string; onPress: () => void }
}) {
  return (
    <View className="flex-row items-center justify-between px-1 pt-2">
      {label}
      {action ? (
        <Pressable
          accessibilityRole="button"
          onPress={action.onPress}
          className="h-8 justify-center px-1 active:opacity-60"
        >
          <Text className="text-[13px] font-semibold text-wk-brand">{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}
