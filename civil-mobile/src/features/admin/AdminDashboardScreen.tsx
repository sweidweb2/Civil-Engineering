import { useCallback } from 'react'
import { Text, View } from 'react-native'
import { router } from 'expo-router'
import {
  FolderKanban,
  type LucideIcon,
  Star,
  Store,
  UserCheck,
  UserPlus,
} from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { InlineError } from '@/components/feedback/AsyncState'
import {
  ActionTile,
  DashboardScroll,
  HeroMetric,
  MenuGroup,
  MenuRow,
  ProgressRow,
  QuickActions,
  ScreenHeader,
  SectionLabel,
  SeeAll,
  useTodayCaption,
} from '@/components/kit'
import { useRemoteData } from '@/hooks/useRemoteData'
import { enumLabel } from '@/i18n/labels'
import { cacheKeys } from '@/lib/cacheKeys'
import { formatCount } from '@/lib/stats'
import { userFirstName } from '@/lib/user'
import { type AdminOverview, getAdminOverview } from '@/services/users'
import { useAuthStore } from '@/stores/authStore'
import { MONO_STYLE } from '@/theme/typography'

/** One request: backend aggregates every tile + the five most recent projects. */
async function loadOverview(): Promise<AdminOverview> {
  const { data } = await getAdminOverview()
  return data
}
/** Grouped-list row with a mono count as its one trailing element. */
function CountRow({
  icon,
  label,
  count,
  href,
  attention = false,
  last = false,
}: {
  icon?: LucideIcon
  label: string
  count: string
  href: string
  attention?: boolean
  last?: boolean
}) {
  return (
    <MenuRow
      icon={icon}
      label={label}
      last={last}
      trailing={
        <Text
          className={`text-base ${attention ? 'font-medium text-warning' : 'text-foreground'}`}
          style={MONO_STYLE}
        >
          {count}
        </Text>
      }
      onPress={() => router.push(href as never)}
    />
  )
}

export function AdminDashboardScreen() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const today = useTodayCaption()
  const load = useCallback(() => loadOverview(), [])
  const remote = useRemoteData(load, { cacheKey: cacheKeys.dashboardAdmin })

  const data = remote.status === 'success' ? remote.data : null
  const isFirstLoad = remote.isLoading && !data

  const attention = [
    {
      icon: UserCheck,
      label: t('dashboard.workerRequests'),
      count: data?.pendingRequests ?? 0,
      href: '/admin/queue',
    },
    {
      icon: Store,
      label: t('dashboard.pendingProviders'),
      count: data?.pendingProviders ?? 0,
      href: '/admin/providers',
    },
    {
      icon: Star,
      label: t('dashboard.pendingReviews'),
      count: data?.pendingReviews ?? 0,
      href: '/admin/reviews',
    },
  ]
  const waiting = data ? attention.reduce((sum, item) => sum + item.count, 0) : null
  const open = attention.filter((item) => item.count > 0)

  const overview = [
    { label: t('users.title'), value: data?.users, href: '/admin/users' },
    { label: t('providers.title'), value: data?.providers, href: '/admin/providers' },
    { label: t('projects.title'), value: data?.projects, href: '/admin/projects' },
    { label: t('listings.title'), value: data?.listings, href: '/admin/listings' },
  ]

  return (
    <View className="flex-1 bg-background" testID="e2e-root">
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

        <HeroMetric
          label={t('dashboard.toReview')}
          value={formatCount(waiting, isFirstLoad)}
          context={waiting === 0 ? t('dashboard.allClear') : undefined}
        />

        {open.length > 0 ? (
          <MenuGroup>
            {open.map((item, index) => (
              <CountRow
                key={item.href}
                icon={item.icon}
                label={item.label}
                count={formatCount(item.count, false)}
                href={item.href}
                attention
                last={index === open.length - 1}
              />
            ))}
          </MenuGroup>
        ) : null}

        <QuickActions>
          <ActionTile
            icon={UserPlus}
            label={t('users.new')}
            onPress={() => router.push('/admin/users/new' as never)}
          />
          <ActionTile
            icon={Store}
            label={t('providers.new')}
            onPress={() => router.push('/admin/providers/new' as never)}
          />
          <ActionTile
            icon={FolderKanban}
            label={t('projects.new')}
            onPress={() => router.push('/admin/projects/new' as never)}
          />
        </QuickActions>

        <View className="gap-3">
          <SectionLabel>{t('dashboard.overview')}</SectionLabel>
          <MenuGroup>
            {overview.map((item, index) => (
              <CountRow
                key={item.href}
                label={item.label}
                count={formatCount(item.value, isFirstLoad)}
                href={item.href}
                last={index === overview.length - 1}
              />
            ))}
          </MenuGroup>
        </View>

        {data && data.recentProjects.length > 0 ? (
          <View className="gap-3">
            <SectionLabel
              action={
                <SeeAll
                  label={t('common.seeAll')}
                  onPress={() => router.push('/admin/projects' as never)}
                />
              }
            >
              {t('dashboard.recentProjects')}
            </SectionLabel>
            <MenuGroup>
              {data.recentProjects.map((project, index) => (
                <ProgressRow
                  key={project.id}
                  title={project.name}
                  caption={enumLabel(t, 'projectStatus', project.status)}
                  value={project.progress}
                  last={index === data.recentProjects.length - 1}
                  onPress={() => router.push(`/admin/projects/${project.id}` as never)}
                />
              ))}
            </MenuGroup>
          </View>
        ) : null}
      </DashboardScroll>
    </View>
  )
}
