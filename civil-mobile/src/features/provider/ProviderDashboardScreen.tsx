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

import { InlineError } from '@/components/feedback/AsyncState'
import {
  ActionTile,
  DashboardScroll,
  EmptyState,
  HeroCard,
  ListCard,
  ListGroup,
  Notice,
  QuickActions,
  ScreenHeader,
  SectionLabel,
  SeeAll,
  StandardListRow,
  Thumbnail,
  type Tone,
  useTodayCaption,
} from '@/components/kit'
import { useRemoteData } from '@/hooks/useRemoteData'
import { cacheKeys } from '@/lib/cacheKeys'
import { formatCount, fulfilledRows } from '@/lib/stats'
import { userFirstName } from '@/lib/user'
import { formatListingPrice, type Listing, listListings } from '@/services/listings'
import { getMyProvider, type Provider } from '@/services/providers'
import { useAuthStore } from '@/stores/authStore'
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
const STATUS_NOTICE: Record<
  Provider['status'],
  { tone: Tone; icon: LucideIcon; title: string; description: string }
> = {
  PENDING: {
    tone: 'warning',
    icon: Clock,
    title: 'providerHome.pendingTitle',
    description: 'providerHome.pendingDescription',
  },
  APPROVED: {
    tone: 'success',
    icon: CheckCircle2,
    title: 'providerHome.approvedTitle',
    description: 'providerHome.approvedDescription',
  },
  SUSPENDED: {
    tone: 'danger',
    icon: ShieldAlert,
    title: 'providerHome.suspendedTitle',
    description: 'providerHome.suspendedDescription',
  },
}

export function ProviderDashboardScreen() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const today = useTodayCaption()
  const load = useCallback(() => loadOverview(), [])
  const remote = useRemoteData(load, { cacheKey: cacheKeys.dashboardProvider })

  const data = remote.status === 'success' ? remote.data : null
  const isFirstLoad = remote.isLoading && !data
  const notice = data?.provider ? STATUS_NOTICE[data.provider.status] : null
  const isEmpty = data?.total === 0
  const toListings = () => router.push('/provider/listings' as never)

  return (
    <View className="flex-1 bg-background" testID="e2e-provider-dashboard">
      <ScreenHeader
        caption={today}
        title={t('dashboard.greeting', { name: user ? userFirstName(user) : t('dashboard.there') })}
      />

      <DashboardScroll
        refreshing={remote.isFetching && Boolean(data)}
        onRefresh={() => void remote.refetch()}
      >
        {remote.status === 'error' && !data ? (
          <InlineError error={remote.error} onRetry={() => void remote.refetch()} />
        ) : null}

        <HeroCard
          caption={t('providerHome.listings')}
          value={formatCount(data?.total, isFirstLoad)}
          onPress={toListings}
          stats={[
            {
              label: t('providerHome.live'),
              value: formatCount(data?.live, isFirstLoad),
              onPress: toListings,
            },
            {
              label: t('providerHome.hidden'),
              value: formatCount(data?.hidden, isFirstLoad),
              onPress: toListings,
            },
          ]}
        />

        {notice ? (
          <Notice
            icon={notice.icon}
            tone={notice.tone}
            title={t(notice.title)}
            description={t(notice.description)}
          />
        ) : null}

        <QuickActions>
          <ActionTile
            icon={PackagePlus}
            label={t('providerHome.newListing')}
            onPress={() => router.push('/provider/listings/new' as never)}
          />
          <ActionTile icon={Package} label={t('providerHome.myListings')} onPress={toListings} />
          <ActionTile
            icon={UserRound}
            label={t('providerHome.editProfile')}
            onPress={() => router.push('/provider/profile' as never)}
          />
        </QuickActions>

        {isEmpty ? (
          <EmptyState
            icon={PackagePlus}
            title={t('providerHome.emptyTitle')}
            description={t('providerHome.emptyDescription')}
            actionLabel={t('providerHome.newListing')}
            onAction={() => router.push('/provider/listings/new' as never)}
          />
        ) : null}

        {data && data.recent.length > 0 ? (
          <View className="gap-3">
            <SectionLabel action={<SeeAll label={t('common.seeAll')} onPress={toListings} />}>
              {t('providerHome.recent')}
            </SectionLabel>
            <ListGroup>
              {data.recent.map((item) => (
                <ListCard
                  key={item.id}
                  accessibilityLabel={item.name}
                  leading={<Thumbnail imageUrl={item.mainImageUrl} icon={Package} size={40} />}
                  onPress={() => router.push(`/provider/listings/${item.id}` as never)}
                >
                  <StandardListRow
                    title={item.name}
                    statusLabel={item.status === 'ACTIVE' ? undefined : t('common.inactive')}
                    statusTone="neutral"
                    extra={
                      <Text className="text-xs text-ink-2" style={MONO_STYLE}>
                        {formatListingPrice(item)}
                      </Text>
                    }
                  />
                </ListCard>
              ))}
            </ListGroup>
          </View>
        ) : null}
      </DashboardScroll>
    </View>
  )
}
