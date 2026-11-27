import { useCallback } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import {
  BadgeCheck,
  Clock,
  LayoutGrid,
  type LucideIcon,
  Plus,
  ShieldAlert,
  Store,
} from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'

import { useTodayCaption } from '@/components/kit'
import { Pressable } from '@/components/ui/pressable'
import { ListingRailCard, PhotoScrim, PvSectionHead } from '@/features/provider/ui/kit'
import { WkError, WkEyebrow, WkHeroGlow, WkPill, WkTabScroll } from '@/components/wk/kit'
import { useWkPalette, type WkTone } from '@/components/wk/palette'
import { useRemoteData } from '@/hooks/useRemoteData'
import { enumLabel } from '@/i18n/labels'
import { cacheKeys } from '@/lib/cacheKeys'
import { REMOTE_IMAGE_CACHE_POLICY, remoteImage } from '@/lib/imageSource'
import { fulfilledRows } from '@/lib/stats'
import { errorMessage } from '@/services/feedback'
import { type Listing, listListings } from '@/services/listings'
import { getMyProvider, type Provider, type ProviderStatus } from '@/services/providers'
import { MONO_STYLE } from '@/theme/typography'

type Overview = {
  provider: Provider | null
  total: number | null
  live: number | null
  hidden: number | null
  recent: Listing[]
}

/**
 * Two parallel calls: own provider profile + a small listing page whose
 * `meta.total` / `meta.statusCounts` drive the stats (provider lists
 * auto-scope to the signed-in provider).
 */
async function loadOverview(): Promise<Overview> {
  const [mine, listings] = await Promise.allSettled([
    getMyProvider(),
    listListings(1, 5, { counts: false }),
  ])
  if (mine.status === 'rejected' && listings.status === 'rejected') throw listings.reason
  const meta = listings.status === 'fulfilled' ? listings.value.meta : null
  return {
    provider: mine.status === 'fulfilled' ? mine.value.data : null,
    total: meta?.total ?? null,
    live: meta?.statusCounts?.ACTIVE ?? null,
    hidden: meta?.statusCounts?.INACTIVE ?? null,
    recent: fulfilledRows(listings),
  }
}

const STATUS_TONE: Record<ProviderStatus, WkTone> = {
  APPROVED: 'green',
  PENDING: 'amber',
  SUSPENDED: 'red',
}

/** Account-state banner. Approved needs none: the green pill says it. */
const STATUS_BANNER: Partial<
  Record<ProviderStatus, { icon: LucideIcon; title: string; body: string }>
> = {
  PENDING: {
    icon: Clock,
    title: 'providerHome.pendingTitle',
    body: 'providerHome.pendingDescription',
  },
  SUSPENDED: {
    icon: ShieldAlert,
    title: 'providerHome.suspendedTitle',
    body: 'providerHome.suspendedDescription',
  },
}

const toListings = (status?: 'ACTIVE' | 'INACTIVE') =>
  router.replace((status ? `/provider/listings?status=${status}` : '/provider/listings') as never)
const toNewListing = () => router.push('/provider/listings/new' as never)

export function ProviderDashboardScreen() {
  const { t } = useTranslation()
  const today = useTodayCaption()
  const { c, shadow } = useWkPalette()
  const load = useCallback(() => loadOverview(), [])
  const remote = useRemoteData(load, { cacheKey: cacheKeys.dashboardProvider })

  const data = remote.status === 'success' ? remote.data : null
  const provider = data?.provider ?? null
  const total = data?.total ?? 0
  const live = data?.live ?? 0
  const recent = data?.recent ?? []
  const heroListing = recent.find((l) => l.mainImageUrl)
  const heroPhoto = heroListing?.mainImageUrl ?? null
  const banner = provider ? STATUS_BANNER[provider.status] : undefined

  const hero = !data
    ? null
    : total === 0
      ? {
          title: t('providerPortal.heroEmpty'),
          body: t('providerPortal.heroEmptyBody'),
          cta: t('providerPortal.createFirst'),
          icon: Plus,
          onPress: toNewListing,
        }
      : {
          title:
            live > 0
              ? t('providerPortal.heroLive', { live, total })
              : t('providerPortal.heroNoneLive'),
          body: live > 0 ? null : t('providerPortal.heroNoneLiveBody'),
          cta: t('providerPortal.viewListings'),
          icon: LayoutGrid,
          onPress: () => toListings(),
        }

  const stats: {
    label: string
    value: number | null
    dot: string
    status?: 'ACTIVE' | 'INACTIVE'
  }[] = [
    { label: t('providerHome.listings'), value: data?.total ?? null, dot: c.ink3 },
    { label: t('providerHome.live'), value: data?.live ?? null, dot: '#22A35A', status: 'ACTIVE' },
    {
      label: t('providerHome.hidden'),
      value: data?.hidden ?? null,
      dot: '#9EA29B',
      status: 'INACTIVE',
    },
  ]

  return (
    <WkTabScroll
      testID="e2e-provider-dashboard"
      refreshing={remote.isFetching && Boolean(data)}
      onRefresh={() => remote.refetch()}
    >
      {/* Date + company, account status */}
      <View className="flex-row items-center justify-between gap-3 px-1 pt-1">
        <View className="min-w-0 flex-1 gap-1.5">
          <WkEyebrow>{today}</WkEyebrow>
          <Text className="text-[15px] font-medium text-wk-ink2" numberOfLines={1}>
            {provider?.name ?? t('profile.yourCompany')}
          </Text>
        </View>
        {provider ? (
          provider.status === 'APPROVED' ? (
            <View className="h-[30px] flex-row items-center gap-1.5 rounded-full bg-wk-brand-soft px-3">
              <BadgeCheck size={15} color={c.brand} strokeWidth={2} />
              <Text className="text-[13px] font-medium text-wk-brand">
                {enumLabel(t, 'providerStatus', provider.status)}
              </Text>
            </View>
          ) : (
            <WkPill
              label={enumLabel(t, 'providerStatus', provider.status)}
              tone={STATUS_TONE[provider.status]}
              dot
              size="md"
            />
          )
        ) : null}
      </View>

      {remote.status === 'error' && !data ? (
        <WkError
          message={errorMessage(remote.error, t('common.errorGeneric'))}
          onRetry={() => void remote.refetch()}
        />
      ) : null}

      {/* Storefront hero */}
      <View className="h-[300px] overflow-hidden rounded-[28px] bg-wk-hero">
        {heroPhoto ? (
          <Animated.View entering={FadeIn.duration(500)} style={{ position: 'absolute', inset: 0 }}>
            <Image
              source={remoteImage(heroPhoto, heroListing?.mainImageKey)}
              cachePolicy={REMOTE_IMAGE_CACHE_POLICY}
              style={{ position: 'absolute', inset: 0 }}
              contentFit="cover"
              transition={250}
            />
            <PhotoScrim
              id="pvHomeHero"
              stops={[
                [0, 0.1],
                [0.4, 0.25],
                [1, 0.92],
              ]}
            />
          </Animated.View>
        ) : (
          <WkHeroGlow size={320} />
        )}
        {hero ? (
          <Animated.View
            entering={FadeInDown.duration(360)}
            className="absolute inset-x-5 bottom-5 gap-3.5"
          >
            <View className="gap-1.5">
              <Text
                className="text-[11px] font-medium uppercase"
                style={[MONO_STYLE, { color: 'rgba(255,255,255,0.72)' }]}
              >
                {t('providerPortal.storefront')}
              </Text>
              <Text className="text-2xl font-semibold leading-7 text-white">{hero.title}</Text>
              {hero.body ? (
                <Text
                  className="text-[13px] leading-[19px]"
                  style={{ color: 'rgba(255,255,255,0.78)' }}
                >
                  {hero.body}
                </Text>
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={hero.cta}
              onPress={hero.onPress}
              className="h-[50px] flex-row items-center justify-center gap-2 rounded-2xl bg-white active:opacity-85"
            >
              <hero.icon size={18} color="#0A1F12" strokeWidth={2} />
              <Text className="text-[15px] font-semibold" style={{ color: '#0A1F12' }}>
                {hero.cta}
              </Text>
            </Pressable>
          </Animated.View>
        ) : null}
      </View>

      {/* Stats */}
      <View className="flex-row gap-2.5">
        {stats.map((stat) => (
          <Pressable
            key={stat.label}
            accessibilityRole="button"
            accessibilityLabel={`${stat.label}: ${stat.value ?? '—'}`}
            onPress={() => toListings(stat.status)}
            className="flex-1 items-start gap-2.5 rounded-[18px] bg-wk-sf p-3.5 active:opacity-80"
            style={shadow}
          >
            <View className="flex-row items-center gap-1.5">
              <View className="size-1.5 rounded-full" style={{ backgroundColor: stat.dot }} />
              <WkEyebrow>{stat.label}</WkEyebrow>
            </View>
            <Text
              className="text-2xl font-semibold text-wk-ink"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {stat.value ?? '—'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Approval / suspension banner */}
      {banner && provider ? (
        <View
          className={`flex-row items-center gap-3 rounded-[18px] px-4 py-3.5 ${
            provider.status === 'SUSPENDED' ? 'bg-wk-red-soft' : 'bg-wk-amber-soft'
          }`}
        >
          <View className="size-9 items-center justify-center rounded-[10px] bg-wk-sf">
            <banner.icon
              size={18}
              color={provider.status === 'SUSPENDED' ? c.red : c.amber}
              strokeWidth={1.9}
            />
          </View>
          <View className="min-w-0 flex-1 gap-0.5">
            <Text
              className={`text-[15px] font-semibold ${
                provider.status === 'SUSPENDED' ? 'text-wk-red' : 'text-wk-amber'
              }`}
            >
              {t(banner.title)}
            </Text>
            <Text className="text-[13px] leading-[18px] text-wk-ink2">{t(banner.body)}</Text>
          </View>
        </View>
      ) : null}

      {/* Quick actions */}
      <View className="flex-row gap-2.5">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('providerHome.newListing')}
          onPress={toNewListing}
          className="min-h-24 items-start justify-between gap-2.5 rounded-[18px] bg-wk-ink p-3.5 active:opacity-85"
          style={{ flex: 1.25 }}
        >
          <View className="size-9 items-center justify-center rounded-[11px] bg-wk-brand">
            <Plus size={19} color="#FFFFFF" strokeWidth={2.2} />
          </View>
          <Text className="text-[15px] font-semibold leading-[18px] text-wk-bg">
            {t('providerHome.newListing')}
          </Text>
        </Pressable>
        {[
          { label: t('providerHome.myListings'), icon: LayoutGrid, onPress: () => toListings() },
          {
            label: t('providerHome.editProfile'),
            icon: Store,
            onPress: () => router.replace('/provider/profile' as never),
          },
        ].map((action) => (
          <Pressable
            key={action.label}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={action.onPress}
            className="min-h-24 flex-1 items-start justify-between gap-2.5 rounded-[18px] bg-wk-sf p-3.5 active:opacity-80"
            style={shadow}
          >
            <View className="size-9 items-center justify-center rounded-[11px] bg-wk-brand-soft">
              <action.icon size={18} color={c.brand} strokeWidth={1.9} />
            </View>
            <Text className="text-[15px] font-semibold leading-[18px] text-wk-ink">
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Recent listings rail */}
      {recent.length > 0 ? (
        <View className="gap-3">
          <PvSectionHead
            label={<WkEyebrow>{t('providerHome.recent')}</WkEyebrow>}
            action={{ label: t('common.seeAll'), onPress: () => toListings() }}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="-mx-5"
            contentContainerClassName="gap-3 px-5 pb-2"
            snapToInterval={224}
            decelerationRate="fast"
          >
            {recent.map((listing) => (
              <ListingRailCard
                key={listing.id}
                listing={listing}
                onPress={() => router.push(`/provider/listings/${listing.id}` as never)}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}
    </WkTabScroll>
  )
}
