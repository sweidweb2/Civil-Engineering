import { useCallback } from 'react'
import { Text, View } from 'react-native'
import { router } from 'expo-router'
import type { LucideIcon } from 'lucide-react-native'
import {
  CheckCircle2,
  Clock,
  Package,
  PackagePlus,
  ShieldAlert,
  UserRound,
} from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import {
  ActionTile,
  Avatar,
  Card,
  DashboardScroll,
  EmptyState,
  HeroHeader,
  HeroStat,
  IconTile,
  ListCard,
  SectionLabel,
  StatusPill,
  Thumbnail,
  type Tone,
} from '@/components/kit'
import { Pressable } from '@/components/ui/pressable'
import { useRemoteData } from '@/hooks/useRemoteData'
import { cacheKeys } from '@/lib/cacheKeys'
import { formatCount, fulfilledRows } from '@/lib/stats'
import { userDisplayName, userFirstName } from '@/lib/user'
import { formatListingPrice, type Listing, listListings } from '@/services/listings'
import { getMyProvider, type Provider } from '@/services/providers'
import { useAuthStore } from '@/stores/authStore'

type Overview = {
  provider: Provider | null
  total: number | null
  live: number | null
  hidden: number | null
  recent: Listing[]
}

/**
 * Two parallel calls: own provider profile + a small listing page whose
 * `meta.total` / `meta.statusCounts` drive the hero stats (provider lists
 * auto-scope to the signed-in provider). `providers:me` is seeded by the
 * profile/editor screens through `useRemoteData`, not from here.
 */
async function loadOverview(): Promise<Overview> {
  const [mine, listings] = await Promise.allSettled([
    getMyProvider(),
    listListings(1, 5, { counts: false }),
  ])
  const meta = listings.status === 'fulfilled' ? listings.value.meta : null
  return {
    provider: mine.status === 'fulfilled' ? mine.value.data : null,
    total: meta?.total ?? null,
    live: meta?.statusCounts?.ACTIVE ?? null,
    hidden: meta?.statusCounts?.INACTIVE ?? null,
    recent: fulfilledRows(listings),
  }
}
const STATUS_BANNER: Record<
  Provider['status'],
  {
    tone: Tone
    icon: LucideIcon
    title: string
    description: string
    textClass: string
    boxClass: string
  }
> = {
  PENDING: {
    tone: 'warning',
    icon: Clock,
    title: 'providerHome.pendingTitle',
    description: 'providerHome.pendingDescription',
    textClass: 'text-warning',
    boxClass: 'border-warning/30 bg-warning/10',
  },
  APPROVED: {
    tone: 'success',
    icon: CheckCircle2,
    title: 'providerHome.approvedTitle',
    description: 'providerHome.approvedDescription',
    textClass: 'text-success',
    boxClass: 'border-success/30 bg-success/10',
  },
  SUSPENDED: {
    tone: 'danger',
    icon: ShieldAlert,
    title: 'providerHome.suspendedTitle',
    description: 'providerHome.suspendedDescription',
    textClass: 'text-destructive',
    boxClass: 'border-destructive/30 bg-destructive/10',
  },
}

export function ProviderDashboardScreen() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const load = useCallback(() => loadOverview(), [])
  const remote = useRemoteData(load, { cacheKey: cacheKeys.dashboardProvider })

  const data = remote.status === 'success' ? remote.data : null
  const isFirstLoad = remote.isLoading && !data
  const banner = data?.provider ? STATUS_BANNER[data.provider.status] : null
  const isEmpty = data?.total === 0

  return (
    <View className="flex-1 bg-background" testID="e2e-provider-dashboard">
      <HeroHeader
        eyebrow={data?.provider?.name ?? t('providerHome.eyebrow')}
        title={t('dashboard.greeting', { name: user ? userFirstName(user) : t('dashboard.there') })}
        subtitle={t('providerHome.subtitle')}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('dashboard.openAccount')}
            onPress={() => router.push('/provider/profile' as never)}
          >
            <Avatar name={user ? userDisplayName(user) : '?'} size={44} onHero />
          </Pressable>
        }
      >
        <View className="flex-row gap-3">
          <HeroStat
            label={t('providerHome.listings')}
            value={formatCount(data?.total, isFirstLoad)}
            onPress={() => router.push('/provider/listings' as never)}
          />
          <HeroStat
            label={t('providerHome.live')}
            value={formatCount(data?.live, isFirstLoad)}
            onPress={() => router.push('/provider/listings' as never)}
          />
          <HeroStat
            label={t('providerHome.hidden')}
            value={formatCount(data?.hidden, isFirstLoad)}
            onPress={() => router.push('/provider/listings' as never)}
          />
        </View>
      </HeroHeader>

      <DashboardScroll
        refreshing={remote.isFetching && Boolean(data)}
        onRefresh={() => void remote.refetch()}
      >
        {banner ? (
          <View className={`flex-row items-center gap-4 rounded-3xl border p-4 ${banner.boxClass}`}>
            <IconTile icon={banner.icon} tone={banner.tone} size={44} />
            <View className="min-w-0 flex-1 gap-0.5">
              <Text className={`text-base font-bold ${banner.textClass}`}>{t(banner.title)}</Text>
              <Text className="text-sm leading-5 text-muted-foreground">
                {t(banner.description)}
              </Text>
            </View>
          </View>
        ) : null}

        <View className="gap-3">
          <SectionLabel>{t('providerHome.quickActions')}</SectionLabel>
          <Card>
            <View className="flex-row justify-between">
              <ActionTile
                icon={PackagePlus}
                label={t('providerHome.newListing')}
                onPress={() => router.push('/provider/listings/new' as never)}
              />
              <ActionTile
                icon={Package}
                tone="success"
                label={t('providerHome.myListings')}
                onPress={() => router.push('/provider/listings' as never)}
              />
              <ActionTile
                icon={UserRound}
                tone="info"
                label={t('providerHome.editProfile')}
                onPress={() => router.push('/provider/profile' as never)}
              />
            </View>
          </Card>
        </View>

        {isEmpty ? (
          <Card>
            <EmptyState
              icon={PackagePlus}
              title={t('providerHome.emptyTitle')}
              description={t('providerHome.emptyDescription')}
              actionLabel={t('providerHome.newListing')}
              onAction={() => router.push('/provider/listings/new' as never)}
            />
          </Card>
        ) : null}

        {data && data.recent.length > 0 ? (
          <View className="gap-3">
            <SectionLabel
              action={
                <Pressable
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => router.push('/provider/listings' as never)}
                >
                  <Text className="text-sm font-semibold text-primary">{t('common.seeAll')}</Text>
                </Pressable>
              }
            >
              {t('providerHome.recent')}
            </SectionLabel>
            <View className="gap-4">
              {data.recent.map((item) => (
                <ListCard
                  key={item.id}
                  accessibilityLabel={item.name}
                  leading={<Thumbnail imageUrl={item.mainImageUrl} icon={Package} />}
                  onPress={() => router.push(`/provider/listings/${item.id}` as never)}
                >
                  <View className="flex-row items-start justify-between gap-2">
                    <Text
                      className="min-w-0 flex-1 text-base font-bold text-foreground"
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    <StatusPill
                      label={item.status === 'ACTIVE' ? t('common.active') : t('common.inactive')}
                      tone={item.status === 'ACTIVE' ? 'success' : 'neutral'}
                    />
                  </View>
                  <Text className="text-sm font-bold text-primary">{formatListingPrice(item)}</Text>
                </ListCard>
              ))}
            </View>
          </View>
        ) : null}
      </DashboardScroll>
    </View>
  )
}
