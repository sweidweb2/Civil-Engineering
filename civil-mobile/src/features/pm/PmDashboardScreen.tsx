import { useCallback } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { router } from 'expo-router'
import { FolderKanban, FolderPlus, Library, PauseCircle } from 'lucide-react-native'
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
  PressableScale,
  ProgressBar,
  SectionLabel,
  StatusPill,
  toneForStatus,
} from '@/components/kit'
import { Pressable } from '@/components/ui/pressable'
import { useRemoteData } from '@/hooks/useRemoteData'
import { useThemeColors } from '@/hooks/useThemeColors'
import { enumLabel } from '@/i18n/labels'
import { userDisplayName, userFirstName } from '@/lib/user'
import { listProjects, type Project, type ProjectStatus } from '@/services/projects'
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

function totalOf(result: PromiseSettledResult<{ meta: { total: number } }>): number | null {
  return result.status === 'fulfilled' ? result.value.meta.total : null
}

/** Each count loads on its own so one failing request only blanks its own tile. */
async function loadOverview(): Promise<Overview> {
  const count = (status: ProjectStatus) => listProjects({ page: 1, limit: 1, status })
  const [all, inProgress, completed, onHold] = await Promise.allSettled([
    listProjects({ page: 1, limit: 5 }),
    listProjects({ page: 1, limit: 10, status: 'IN_PROGRESS' }),
    count('COMPLETED'),
    count('ON_HOLD'),
  ])
  return {
    total: totalOf(all),
    inProgress: totalOf(inProgress),
    completed: totalOf(completed),
    onHold: totalOf(onHold),
    active: inProgress.status === 'fulfilled' ? inProgress.value.data : [],
    recent: all.status === 'fulfilled' ? all.value.data : [],
  }
}

function formatCount(value: number | null | undefined, isLoading: boolean): string {
  if (isLoading) return '…'
  return value == null ? '—' : value.toLocaleString()
}

function ActiveProjectCard({ project }: { project: Project }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={project.name}
      className="w-64 gap-4 rounded-3xl border border-border/40 bg-card p-5"
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
  const colors = useThemeColors()
  const user = useAuthStore((s) => s.user)
  const load = useCallback(() => loadOverview(), [])
  const remote = useRemoteData(load)

  const data = remote.status === 'success' ? remote.data : null
  const isFirstLoad = remote.isLoading && !data
  const isEmpty = data?.total === 0

  return (
    <View className="flex-1 bg-background" testID="e2e-pm-dashboard">
      <HeroHeader
        eyebrow={t('pmHome.eyebrow')}
        title={t('dashboard.greeting', { name: user ? userFirstName(user) : t('dashboard.there') })}
        subtitle={t('pmHome.subtitle')}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('dashboard.openAccount')}
            onPress={() => router.push('/pm/account' as never)}
          >
            <Avatar name={user ? userDisplayName(user) : '?'} size={44} onHero />
          </Pressable>
        }
      >
        <View className="flex-row gap-3">
          <HeroStat
            label={t('pmHome.active')}
            value={formatCount(data?.inProgress, isFirstLoad)}
            onPress={() => router.push('/pm/projects' as never)}
          />
          <HeroStat
            label={t('pmHome.onHold')}
            value={formatCount(data?.onHold, isFirstLoad)}
            onPress={() => router.push('/pm/projects' as never)}
          />
          <HeroStat
            label={t('pmHome.completed')}
            value={formatCount(data?.completed, isFirstLoad)}
            onPress={() => router.push('/pm/projects' as never)}
          />
        </View>
      </HeroHeader>

      <DashboardScroll
        refreshing={remote.isLoading && Boolean(data)}
        onRefresh={() => void remote.refetch()}
      >
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
            className="flex-row items-center gap-4 rounded-3xl border border-warning/30 bg-warning/10 p-4"
            onPress={() => router.push('/pm/projects' as never)}
          >
            <IconTile icon={PauseCircle} tone="warning" size={44} />
            <View className="min-w-0 flex-1">
              <Text className="text-xs font-bold uppercase tracking-widest text-warning">
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
                <Pressable
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => router.push('/pm/projects' as never)}
                >
                  <Text className="text-sm font-semibold text-primary">{t('common.seeAll')}</Text>
                </Pressable>
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
                      className="w-10 text-right text-xs font-semibold text-muted-foreground"
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
