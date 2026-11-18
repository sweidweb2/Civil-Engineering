import { useCallback } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { router } from 'expo-router'
import { FolderKanban, FolderPlus, Library, PauseCircle } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import {
  ActionTile,
  Card,
  DashboardScroll,
  EmptyState,
  IconTile,
  PressableScale,
  ProgressBar,
  ScreenHeader,
  SectionLabel,
  HeroCard,
  SeeAll,
  StatusPill,
  toneForStatus,
} from '@/components/kit'
import { Pressable } from '@/components/ui/pressable'
import { useRemoteData } from '@/hooks/useRemoteData'
import { enumLabel } from '@/i18n/labels'
import { cacheKeys } from '@/lib/cacheKeys'
import { tracking } from '@/lib/rtl'
import { formatCount, fulfilledRows, totalOf } from '@/lib/stats'
import { userFirstName } from '@/lib/user'
import { getProjectSummary, listProjects, type Project } from '@/services/projects'
import { useAuthStore } from '@/stores/authStore'
import { softShadows } from '@/theme/shadows'

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

function ActiveProjectCard({ project }: { project: Project }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={project.name}
      className="w-64 gap-4 rounded-2xl border border-border/40 bg-card p-5"
      style={softShadows.card}
      onPress={() => router.push(`/pm/projects/${project.id}` as never)}
    >
      <View className="gap-1">
        <Text className="text-base font-bold text-foreground" numberOfLines={1}>
          {project.name}
        </Text>
        <Text className="text-xs text-muted-foreground" numberOfLines={1}>
          {[project.code, project.city].filter(Boolean).join(' · ') || ' '}
        </Text>
      </View>
      <View className="gap-2">
        <View className="flex-row items-end justify-between">
          <Text
            className="text-3xl font-bold leading-9 text-primary"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {Math.round(project.progress)}%
          </Text>
        </View>
        <ProgressBar value={project.progress} />
      </View>
    </PressableScale>
  )
}

export function PmDashboardScreen() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const load = useCallback(() => loadOverview(), [])
  const remote = useRemoteData(load, { cacheKey: cacheKeys.dashboardPm })

  const data = remote.status === 'success' ? remote.data : null
  const isFirstLoad = remote.isLoading && !data
  const isEmpty = data?.total === 0

  return (
    <View className="flex-1 bg-background" testID="e2e-pm-dashboard">
      <ScreenHeader
        title={t('dashboard.greeting', { name: user ? userFirstName(user) : t('dashboard.there') })}
      ></ScreenHeader>

      <DashboardScroll
        refreshing={remote.isFetching && Boolean(data)}
        onRefresh={() => void remote.refetch()}
      >
        <HeroCard
          caption={t('projects.title')}
          value={formatCount(data?.total, isFirstLoad)}
          onPress={() => router.push('/pm/projects' as never)}
          stats={[
            {
              label: t('pmHome.active'),
              value: formatCount(data?.inProgress, isFirstLoad),
              onPress: () => router.push('/pm/projects' as never),
            },
            {
              label: t('pmHome.onHold'),
              value: formatCount(data?.onHold, isFirstLoad),
              onPress: () => router.push('/pm/projects' as never),
            },
            {
              label: t('pmHome.completed'),
              value: formatCount(data?.completed, isFirstLoad),
              onPress: () => router.push('/pm/projects' as never),
            },
          ]}
        />

        {isEmpty ? (
          <Card className="items-center">
            <EmptyState
              icon={FolderPlus}
              title={t('pmHome.emptyTitle')}
              description={t('pmHome.emptyDescription')}
              actionLabel={t('pmHome.newProject')}
              onAction={() => router.push('/pm/projects/new' as never)}
            />
          </Card>
        ) : null}

        {data && (data.onHold ?? 0) > 0 ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={`${data.onHold} ${t('pmHome.onHoldCount')}`}
            className="flex-row items-center gap-4 rounded-2xl border border-warning/30 bg-warning/10 p-4"
            onPress={() => router.push('/pm/projects' as never)}
          >
            <IconTile icon={PauseCircle} tone="warning" size={44} />
            <View className="min-w-0 flex-1">
              <Text className={`text-xs font-bold uppercase text-warning ${tracking('widest')}`}>
                {t('pmHome.attention')}
              </Text>
              <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
                {t('pmHome.onHoldCount')}
              </Text>
            </View>
            <Text className="text-2xl font-bold text-warning">{data.onHold}</Text>
          </PressableScale>
        ) : null}

        <View className="gap-3">
          <SectionLabel>{t('pmHome.quickActions')}</SectionLabel>
          <Card>
            <View className="flex-row justify-between">
              <ActionTile
                icon={FolderPlus}
                label={t('pmHome.newProject')}
                onPress={() => router.push('/pm/projects/new' as never)}
              />
              <ActionTile
                icon={FolderKanban}
                tone="success"
                label={t('pmHome.allProjects')}
                onPress={() => router.push('/pm/projects' as never)}
              />
              <ActionTile
                icon={Library}
                tone="info"
                label={t('pmHome.directory')}
                onPress={() => router.push('/pm/directory' as never)}
              />
            </View>
          </Card>
        </View>

        {data && data.active.length > 0 ? (
          <View className="-mx-5 gap-3">
            <View className="px-5">
              <SectionLabel>{t('pmHome.active')}</SectionLabel>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-4 px-5 pb-4 pt-1"
              snapToInterval={272}
              decelerationRate="fast"
            >
              {data.active.map((project) => (
                <ActiveProjectCard key={project.id} project={project} />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {data && data.recent.length > 0 ? (
          <View className="gap-3">
            <SectionLabel
              action={
                <SeeAll
                  label={t('common.seeAll')}
                  onPress={() => router.push('/pm/projects' as never)}
                />
              }
            >
              {t('pmHome.recent')}
            </SectionLabel>
            <Card className="py-1">
              {data.recent.map((project, index) => (
                <Pressable
                  key={project.id}
                  accessibilityRole="button"
                  accessibilityLabel={project.name}
                  className={`gap-3 py-4 active:opacity-70 ${
                    index === data.recent.length - 1 ? '' : 'border-b border-border/40'
                  }`}
                  onPress={() => router.push(`/pm/projects/${project.id}` as never)}
                >
                  <View className="flex-row items-center justify-between gap-3">
                    <Text
                      className="min-w-0 flex-1 text-base font-semibold text-foreground"
                      numberOfLines={1}
                    >
                      {project.name}
                    </Text>
                    <StatusPill
                      label={enumLabel(t, 'projectStatus', project.status)}
                      tone={toneForStatus(project.status)}
                    />
                  </View>
                  <View className="flex-row items-center gap-3">
                    <View className="flex-1">
                      <ProgressBar value={project.progress} />
                    </View>
                    <Text
                      className="w-10 text-end text-xs font-semibold text-muted-foreground"
                      style={{ fontVariant: ['tabular-nums'] }}
                    >
                      {Math.round(project.progress)}%
                    </Text>
                  </View>
                </Pressable>
              ))}
            </Card>
          </View>
        ) : null}
      </DashboardScroll>
    </View>
  )
}
