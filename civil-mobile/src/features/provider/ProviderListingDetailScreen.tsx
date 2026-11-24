import { useCallback, useMemo, useRef, useState } from 'react'
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  type ScrollViewInstance,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import { Image } from 'expo-image'
import { router, useLocalSearchParams } from 'expo-router'
import {
  ChevronLeft,
  Eye,
  EyeOff,
  LayoutGrid,
  type LucideIcon,
  Package,
  Pencil,
  Tag,
  Trash2,
} from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useStatusBarStyle } from '@/components/kit'
import { Pressable } from '@/components/ui/pressable'
import {
  ListingPhoto,
  PhotoScrim,
  rentPrice,
  salePrice,
  statusLabel,
  useCategoryName,
} from '@/features/provider/ui/kit'
import {
  flipStyle,
  WkConfirm,
  type WkConfirmState,
  WkError,
  WkEyebrow,
  WkGroup,
  WkPill,
  WkSkeletonCard,
} from '@/features/worker/ui/kit'
import { useWorkerPalette } from '@/features/worker/ui/palette'
import { useHandleApiError } from '@/hooks/useHandleApiError'
import { useRemoteData } from '@/hooks/useRemoteData'
import { enumLabel } from '@/i18n/labels'
import { cacheKeys, invalidateListingCaches } from '@/lib/cacheKeys'
import { REMOTE_IMAGE_CACHE_POLICY, remoteImage } from '@/lib/imageSource'
import { ltr } from '@/lib/rtl'
import { errorMessage } from '@/services/feedback'
import { listGalleryImages } from '@/services/galleryImages'
import { deleteListing, getListingById, type Listing, updateListing } from '@/services/listings'
import { useToastSuccess } from '@/services/toast'
import { MONO_STYLE } from '@/theme/typography'

const DEFAULT_BASE = '/provider/listings'
const PHOTO_HEIGHT = 420

function goBack(base: string) {
  if (router.canGoBack()) router.back()
  else router.replace(base as never)
}

/** Photo-first listing page for the provider: gallery, prices, facts, actions. */
export function ProviderListingDetailScreen({
  basePath = DEFAULT_BASE,
}: { basePath?: string } = {}) {
  const BASE = basePath
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const { c, shadow } = useWorkerPalette()
  useStatusBarStyle('light')
  const handleApiError = useHandleApiError()
  const toastSuccess = useToastSuccess()
  const categoryName = useCategoryName()

  const { id } = useLocalSearchParams<{ id: string }>()
  const listingId = typeof id === 'string' ? id : id?.[0]

  const load = useCallback(async () => {
    if (!listingId) throw new Error('Listing id required')
    const [listing, images] = await Promise.all([
      getListingById(listingId),
      // Photos are a nice-to-have here: a failure falls back to the main image.
      listGalleryImages('listing', listingId).catch(() => ({ data: [] })),
    ])
    return { listing: listing.data, images: images.data }
  }, [listingId])
  const remote = useRemoteData(load, {
    enabled: Boolean(listingId),
    cacheKey: listingId ? `${cacheKeys.listingDetail}:${listingId}:view` : undefined,
  })
  const data = remote.status === 'success' ? remote.data : null
  const listing = data?.listing ?? null

  const photos = useMemo(() => {
    if (!data) return []
    // `key` = stable storage path, so re-signed URLs still hit the image cache.
    const shots: { uri: string; key: string | null }[] = [...data.images]
      .sort((a, b) => Number(b.isMain) - Number(a.isMain) || a.displayOrder - b.displayOrder)
      .filter((img): img is typeof img & { url: string } => Boolean(img.url))
      .map((img) => ({ uri: img.url, key: img.storagePath }))
    if (shots.length === 0 && data.listing.mainImageUrl) {
      shots.push({ uri: data.listing.mainImageUrl, key: data.listing.mainImageKey ?? null })
    }
    return shots
  }, [data])

  const [index, setIndex] = useState(0)
  const pager = useRef<ScrollViewInstance>(null)
  const [busy, setBusy] = useState<'status' | 'delete' | null>(null)
  const [confirm, setConfirm] = useState<WkConfirmState | null>(null)

  function onPage(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(e.nativeEvent.contentOffset.x / width)
    if (next !== index) setIndex(Math.max(0, Math.min(photos.length - 1, next)))
  }

  function showPhoto(i: number) {
    setIndex(i)
    pager.current?.scrollTo({ x: i * width, animated: true })
  }

  async function toggleStatus(current: Listing) {
    const next = current.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    setBusy('status')
    try {
      await updateListing(current.id, { status: next })
      invalidateListingCaches()
      toastSuccess(
        next === 'ACTIVE' ? t('providerPortal.liveToast') : t('providerPortal.hiddenToast'),
      )
      await remote.refetch()
    } catch (error) {
      handleApiError(error, t('listings.saveFailed'))
    } finally {
      setBusy(null)
    }
  }

  function askDelete(current: Listing) {
    setConfirm({
      title: t('listings.deleteTitle'),
      body: t('providerPortal.deleteBody', { name: current.name }),
      cta: t('common.delete'),
      onConfirm: () => {
        setConfirm(null)
        void (async () => {
          setBusy('delete')
          try {
            const result = await deleteListing(current.id)
            invalidateListingCaches()
            toastSuccess(
              t(result.data.outcome === 'hidden' ? 'listings.hidden' : 'listings.deleted'),
            )
            router.replace(BASE as never)
          } catch (error) {
            handleApiError(error, t('listings.deleteFailed'))
          } finally {
            setBusy(null)
          }
        })()
      },
    })
  }

  const backButton = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('common.goBack')}
      onPress={() => goBack(BASE)}
      className="size-11 items-center justify-center rounded-full active:opacity-70"
      style={{ backgroundColor: 'rgba(255,255,255,0.9)' }}
    >
      <View style={flipStyle()}>
        <ChevronLeft size={20} color="#141614" strokeWidth={2} />
      </View>
    </Pressable>
  )

  if (!listing) {
    return (
      <View className="flex-1 bg-wk-bg">
        <View className="bg-wk-hero" style={{ height: PHOTO_HEIGHT * 0.7 }}>
          <View className="absolute inset-x-4" style={{ top: insets.top + 6 }}>
            {backButton}
          </View>
        </View>
        <View className="-mt-7 flex-1 gap-3.5 rounded-t-[28px] bg-wk-bg px-5 pt-6">
          {remote.status === 'error' ? (
            <WkError
              message={errorMessage(remote.error, t('common.errorGeneric'))}
              onRetry={() => void remote.refetch()}
            />
          ) : (
            <>
              <WkSkeletonCard />
              <WkSkeletonCard />
            </>
          )}
        </View>
      </View>
    )
  }

  const sale = salePrice(listing)
  const rent = listing.rentalPrice && listing.rentalUnit ? rentPrice(listing) : ''
  const category = categoryName(listing)
  const isLive = listing.status === 'ACTIVE'
  const unit = listing.unit?.trim()

  const facts: { icon: LucideIcon; label: string; value: string }[] = [
    {
      icon: Package,
      label: t('listings.quantity'),
      value: listing.quantityAvailable
        ? ltr([listing.quantityAvailable, unit].filter(Boolean).join(' '))
        : '—',
    },
    { icon: Tag, label: t('listings.brand'), value: listing.brand?.trim() || '—' },
    { icon: LayoutGrid, label: t('listings.category'), value: category || '—' },
  ]

  return (
    <View className="flex-1 bg-wk-bg" testID="e2e-provider-listing-detail">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Gallery */}
        <View className="bg-wk-hero" style={{ height: PHOTO_HEIGHT }}>
          {photos.length > 0 ? (
            <ScrollView
              ref={pager}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onPage}
              accessibilityLabel={t('gallery.title')}
            >
              {photos.map(({ uri, key: photoKey }) => (
                <View key={uri} style={{ width, height: PHOTO_HEIGHT }}>
                  <Image
                    source={remoteImage(uri, photoKey)}
                    cachePolicy={REMOTE_IMAGE_CACHE_POLICY}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    transition={200}
                  />
                </View>
              ))}
            </ScrollView>
          ) : (
            <ListingPhoto uri={null} iconSize={44} />
          )}
          <PhotoScrim
            id="pvDetailPhoto"
            stops={[
              [0, 0.35],
              [0.3, 0],
              [0.7, 0],
              [1, 0.3],
            ]}
          />
          {photos.length > 1 ? (
            <View
              pointerEvents="none"
              className="absolute inset-x-0 flex-row justify-center gap-1.5"
              style={{ bottom: 48 }}
            >
              {photos.map(({ uri }, i) => (
                <View
                  key={uri}
                  className="h-1.5 rounded-[3px]"
                  style={{
                    width: i === index ? 20 : 6,
                    backgroundColor: i === index ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
                  }}
                />
              ))}
            </View>
          ) : null}
        </View>

        {/* Content sheet */}
        <Animated.View
          entering={FadeInDown.duration(360)}
          className="-mt-7 gap-[18px] rounded-t-[28px] bg-wk-bg px-5 pt-6"
        >
          <View className="flex-row flex-wrap items-center gap-2">
            <WkPill
              label={statusLabel(t, listing.status)}
              tone={isLive ? 'green' : 'neutral'}
              dot
              size="md"
            />
            {listing.type ? (
              <WkPill label={enumLabel(t, 'listingType', listing.type)} tone="neutral" size="md" />
            ) : null}
            {category ? <WkPill label={category} tone="neutral" size="md" /> : null}
          </View>

          <View className="gap-2">
            <Text
              className="text-2xl font-semibold leading-[29px] text-wk-ink"
              accessibilityRole="header"
            >
              {listing.name}
            </Text>
            {listing.providerName ? (
              <Text className="text-[15px] text-wk-ink2">
                {t('providerPortal.by', { name: listing.providerName })}
              </Text>
            ) : null}
          </View>

          {/* Prices */}
          <View className="flex-row gap-2.5">
            {sale || !rent ? (
              <View className="flex-1 gap-1.5 rounded-[18px] bg-wk-sf p-4" style={shadow}>
                <WkEyebrow>{t('listings.price')}</WkEyebrow>
                <Text className="text-[17px] font-semibold text-wk-ink" numberOfLines={1}>
                  {sale || t('providerPortal.priceOnRequest')}
                </Text>
                {sale && unit ? (
                  <Text className="text-[13px] text-wk-ink3">
                    {t('providerPortal.perUnit', { unit })}
                  </Text>
                ) : null}
              </View>
            ) : null}
            {rent && listing.rentalUnit ? (
              <View className="flex-1 gap-1.5 rounded-[18px] bg-wk-hero p-4">
                <Text className="text-[11px] font-medium uppercase text-wk-lime" style={MONO_STYLE}>
                  {t('providerPortal.forRent')}
                </Text>
                <Text className="text-[17px] font-semibold text-wk-hero-ink" numberOfLines={1}>
                  {rent}
                </Text>
                <Text className="text-[13px] text-wk-hero-mute">
                  {t('providerPortal.perUnit', {
                    unit: enumLabel(t, 'rentalUnit', listing.rentalUnit).toLowerCase(),
                  })}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Facts */}
          <WkGroup>
            {facts.map((fact) => (
              <View
                key={fact.label}
                className="min-h-[52px] flex-row items-center gap-3 bg-wk-sf px-4"
              >
                <fact.icon size={17} color={c.ink3} strokeWidth={1.9} />
                <Text className="min-w-0 flex-1 text-[15px] text-wk-ink2">{fact.label}</Text>
                <Text
                  className="max-w-[55%] text-end text-[15px] font-medium text-wk-ink"
                  numberOfLines={2}
                >
                  {fact.value}
                </Text>
              </View>
            ))}
          </WkGroup>

          {/* Description */}
          <View className="gap-2">
            <WkEyebrow>{t('common.description')}</WkEyebrow>
            <Text className="text-[15px] leading-6 text-wk-ink2">
              {listing.description?.trim() || t('listings.noDescription')}
            </Text>
          </View>

          {/* Thumbnails */}
          {photos.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="-mx-5"
              contentContainerClassName="gap-2 px-5"
            >
              {photos.map(({ uri, key: photoKey }, i) => (
                <Pressable
                  key={uri}
                  accessibilityRole="button"
                  accessibilityLabel={t('providerPortal.photoOf', {
                    index: i + 1,
                    count: photos.length,
                  })}
                  accessibilityState={{ selected: i === index }}
                  onPress={() => showPhoto(i)}
                  className={`size-[72px] overflow-hidden rounded-2xl border-2 bg-wk-sf2 ${
                    i === index ? 'border-wk-brand' : 'border-transparent'
                  }`}
                >
                  <Image
                    source={remoteImage(uri, photoKey)}
                    cachePolicy={REMOTE_IMAGE_CACHE_POLICY}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                  />
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
        </Animated.View>
      </ScrollView>

      {/* Floating top controls */}
      <View
        pointerEvents="box-none"
        className="absolute inset-x-4 flex-row items-start justify-between"
        style={{ top: insets.top + 6 }}
      >
        {backButton}
        {photos.length > 1 ? (
          <Animated.View
            entering={FadeIn}
            className="mt-1.5 h-8 justify-center rounded-full px-3"
            style={{ backgroundColor: 'rgba(10,12,10,0.55)' }}
          >
            <Text className="text-xs font-medium text-white" style={MONO_STYLE}>
              {ltr(`${index + 1} / ${photos.length}`)}
            </Text>
          </Animated.View>
        ) : null}
      </View>

      {/* Action bar */}
      <View
        className="absolute inset-x-0 bottom-0 flex-row gap-2.5 bg-wk-bg px-5 pt-4"
        style={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.delete')}
          accessibilityState={{ busy: busy === 'delete', disabled: busy !== null }}
          disabled={busy !== null}
          onPress={() => askDelete(listing)}
          className="size-[54px] items-center justify-center rounded-2xl bg-wk-red-soft active:opacity-80"
        >
          <Trash2 size={20} color={c.red} strokeWidth={1.9} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isLive ? t('providerPortal.hide') : t('providerPortal.publish')}
          accessibilityState={{ busy: busy === 'status', disabled: busy !== null }}
          disabled={busy !== null}
          onPress={() => void toggleStatus(listing)}
          className={`h-[54px] flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-wk-line2 bg-wk-sf active:opacity-80 ${
            busy === 'status' ? 'opacity-60' : ''
          }`}
        >
          {isLive ? (
            <EyeOff size={18} color={c.ink} strokeWidth={1.9} />
          ) : (
            <Eye size={18} color={c.ink} strokeWidth={1.9} />
          )}
          <Text className="text-[15px] font-semibold text-wk-ink">
            {isLive ? t('providerPortal.hide') : t('providerPortal.publish')}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.edit')}
          disabled={busy !== null}
          onPress={() => router.push(`${BASE}/${listing.id}/edit` as never)}
          className="h-[54px] flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-wk-brand active:opacity-85"
        >
          <Pencil size={17} color={c.onBrand} strokeWidth={2} />
          <Text className="text-[15px] font-semibold text-wk-on-brand">{t('common.edit')}</Text>
        </Pressable>
      </View>

      <WkConfirm state={confirm} onCancel={() => setConfirm(null)} />
    </View>
  )
}
