import { useCallback } from 'react'
import { Text, View } from 'react-native'
import { router } from 'expo-router'
import { FolderKanban, FolderPlus, Library } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { InlineError } from '@/components/feedback/AsyncState'
import {
  ActionTile,
  Avatar,
  DashboardScroll,
  EmptyState,
  FeatureBanner,
  HeroCard,
  MenuGroup,
  MenuRow,
  ProgressRow,
  QuickActions,
  ScreenHeader,
  SectionLabel,
  SeeAll,
  type Tone,
  toneForStatus,
  useTodayCaption,
} from '@/components/kit'
import { Pressable } from '@/components/ui/pressable'
import { useRemoteData } from '@/hooks/useRemoteData'
import { enumLabel } from '@/i18n/labels'
import { cacheKeys } from '@/lib/cacheKeys'
import { formatCount, fulfilledRows, totalOf } from '@/lib/stats'
import { userDisplayName, userFirstName } from '@/lib/user'
import { getProjectSummary, listProjects, type Project } from '@/services/projects'
import { useAuthStore } from '@/stores/authStore'
import { MONO_STYLE } from '@/theme/typography'

type Overview = {
  total: number | null
  inProgress: number | null
  completed: number | null
  onHold: number | null
  active: Project[]
  recent: Project[]
}

/** Summary aggregates + two list slices (recent / active) — 3 calls instead of 4. */
async function loadOverview(): Promise<Overview> {
  const [summary, recent, active] = await Promise.allSettled([
    getProjectSummary(),
    listProjects({ page: 1, limit: 5 }),
    listProjects({ page: 1, limit: 10, status: 'IN_PROGRESS' }),
  ])
  const counts = summary.status === 'fulfilled' ? summary.value.data.counts : null
  return {
    total: summary.status === 'fulfilled' ? summary.value.data.total : totalOf(recent),
    inProgress: counts?.IN_PROGRESS ?? totalOf(active),
    completed: counts?.COMPLETED ?? null,
    onHold: counts?.ON_HOLD ?? null,
    active: fulfilledRows(active),
    recent: fulfilledRows(recent),
  }
}

export function PmDashboardScreen() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const today = useTodayCaption()
  const load = useCallback(() => loadOverview(), [])
  const remote = useRemoteData(load, { cacheKey: cacheKeys.dashboardPm })

  const data = remote.status === 'success' ? remote.data : null
  const isFirstLoad = remote.isLoading && !data
  const isEmpty = data?.total === 0
  const toProjects = () => router.push('/pm/projects' as never)

  return (
    <View className="flex-1 bg-background" testID="e2e-pm-dashboard">
      <ScreenHeader
        caption={today}
        title={t('dashboard.greeting', { name: user ? userFirstName(user) : t('dashboard.there') })}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('dashboard.openAccount')}
            className="active:opacity-70"
            onPress={() => router.push('/pm/account' as never)}
          >
            <Avatar name={user ? userDisplayName(user) : '?'} />
          </Pressable>
        }
      />

      <DashboardScroll
        refreshing={remote.isFetching && Boolean(data)}
        onRefresh={() => void remote.refetch()}
      >
        {remote.status === 'error' && !data ? (
          <InlineError error={remote.error} onRetry={() => void remote.refetch()} />
        ) : null}

        <HeroCard
          caption={t('projects.title')}
          value={formatCount(data?.total, isFirstLoad)}
          onPress={toProjects}
          highlightLast
          stats={[
            {
              label: t('pmHome.active'),
              value: formatCount(data?.inProgress, isFirstLoad),
              onPress: toProjects,
            },
            {
              label: t('pmHome.onHold'),
              value: formatCount(data?.onHold, isFirstLoad),
              onPress: toProjects,
            },
            {
              label: t('pmHome.completed'),
              value: formatCount(data?.completed, isFirstLoad),
              onPress: toProjects,
            },
          ]}
        />

        <QuickActions>
          <ActionTile
            icon={FolderPlus}
            label={t('pmHome.newProject')}
            onPress={() => router.push('/pm/projects/new' as never)}
          />
          <ActionTile icon={FolderKanban} label={t('pmHome.allProjects')} onPress={toProjects} />
          <ActionTile
            icon={Library}
            label={t('pmHome.directory')}
            onPress={() => router.push('/pm/directory' as never)}
          />
        </QuickActions>

        {data && (data.onHold ?? 0) > 0 ? (
          <FeatureBanner
            eyebrow={t('pmHome.attention')}
            title={t('pmHome.onHoldBanner', { count: data.onHold ?? 0 })}
            onPress={toProjects}
          />
        ) : null}

        {isEmpty ? (
          <EmptyState
            icon={FolderPlus}
            title={t('pmHome.emptyTitle')}
            description={t('pmHome.emptyDescription')}
            actionLabel={t('pmHome.newProject')}
            onAction={() => router.push('/pm/projects/new' as never)}
          />
        ) : null}

        {data && data.active.length > 0 ? (
          <View className="gap-3">
            <SectionLabel>{t('pmHome.active')}</SectionLabel>
            <MenuGroup>
              {data.active.map((project, index) => (
                <ProgressRow
                  key={project.id}
                  title={project.name}
                  caption={[project.code, project.city].filter(Boolean).join(' · ') || undefined}
                  value={project.progress}
                  last={index === data.active.length - 1}
                  onPress={() => router.push(`/pm/projects/${project.id}` as never)}
                />
              ))}
            </MenuGroup>
          </View>
        ) : null}

        {data && data.recent.length > 0 ? (
          <View className="gap-3">
            <SectionLabel action={<SeeAll label={t('common.seeAll')} onPress={toProjects} />}>
              {t('pmHome.recent')}
            </SectionLabel>
            <MenuGroup>
              {data.recent.map((project, index) => (
                <MenuRow
                  key={project.id}
                  label={project.name}
                  hint={enumLabel(t, 'projectStatus', project.status)}
                  hintTone={hintToneFor(project.status)}
                  last={index === data.recent.length - 1}
                  trailing={
                    <Text className="text-base text-foreground" style={MONO_STYLE}>
                      {Math.round(project.progress)}%
                    </Text>
                  }
                  onPress={() => router.push(`/pm/projects/${project.id}` as never)}
                />
              ))}
            </MenuGroup>
          </View>
        ) : null}
      </DashboardScroll>
    </View>
  )
}

/** Status hint color: only problems (on hold / cancelled) get a color. */
function hintToneFor(status: Project['status']): Tone | undefined {
  const tone = toneForStatus(status)
  return tone === 'warning' || tone === 'danger' ? tone : undefined
}
