import { useCallback } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { ChevronRight, CirclePause, ContactRound, FolderKanban, Plus } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import Animated, { FadeIn } from 'react-native-reanimated'

import { useTodayCaption } from '@/components/kit'
import { Pressable } from '@/components/ui/pressable'
import {
  flipStyle,
  WkError,
  WkEyebrow,
  WkGroup,
  WkHeroGlow,
  WkSkeletonCard,
  WkTabScroll,
} from '@/components/wk/kit'
import { useWkPalette } from '@/components/wk/palette'
import { PhotoScrim, PvSectionHead } from '@/components/wk/storefront'
import {
  currentStage,
  PHOTO_DOT,
  ProjectGroupRow,
  projectStatusLabel,
  StageSegments,
  stageStates,
} from '@/features/pm/ui/kit'
import { useRemoteData } from '@/hooks/useRemoteData'
import { enumLabel } from '@/i18n/labels'
import { cacheKeys } from '@/lib/cacheKeys'
import { REMOTE_IMAGE_CACHE_POLICY, remoteImage } from '@/lib/imageSource'
import { ltr } from '@/lib/rtl'
import { userFirstName } from '@/lib/user'
import { errorMessage } from '@/services/feedback'
import { getProjectStagesSummaries, type ProjectStagesSummary } from '@/services/project-stages'
import {
  getProjectSummary,
  listProjects,
  type Project,
  type ProjectStatus,
  type ProjectSummary,
} from '@/services/projects'
import { useAuthStore } from '@/stores/authStore'
import { MONO_STYLE } from '@/theme/typography'

const CAROUSEL_STATUSES: ProjectStatus[] = ['IN_PROGRESS', 'APPROVED', 'PLANNING']
const CARD_WIDTH = 296

type Overview = {
  summary: ProjectSummary | null
  projects: Project[]
  /** Carousel projects with their stage summaries (null when that call failed). */
  active: { project: Project; stages: ProjectStagesSummary | null }[]
}

/** List (+ summary) then stage summaries; soft-fail so one half can still render. */
async function loadOverview(): Promise<Overview> {
  let projects: Project[] = []
  let summary: ProjectSummary | null = null
  try {
    const list = await listProjects({ page: 1, limit: 20, includeSummary: true })
    projects = list.data
    summary = list.summary
  } catch {
    const [listResult, summaryResult] = await Promise.allSettled([
      listProjects({ page: 1, limit: 20 }),
      getProjectSummary(),
    ])
    if (listResult.status === 'rejected' && summaryResult.status === 'rejected') {
      throw listResult.reason
    }
    projects = listResult.status === 'fulfilled' ? listResult.value.data : []
    summary = summaryResult.status === 'fulfilled' ? summaryResult.value.data : null
  }

  const carousel = projects.filter((p) => CAROUSEL_STATUSES.includes(p.status)).slice(0, 5)
  const stageMap =
    carousel.length === 0
      ? {}
      : await getProjectStagesSummaries(carousel.map((p) => p.id))
          .then((r) => r.data)
          .catch(() => ({}) as Record<string, ProjectStagesSummary>)
  return {
    summary,
    projects,
    active: carousel.map((project) => ({
      project,
      stages: stageMap[project.id] ?? null,
    })),
  }
}

const toProjects = (status?: ProjectStatus) =>
  router.replace((status ? `/pm/projects?status=${status}` : '/pm/projects') as never)
const toNewProject = () => router.push('/pm/projects/new' as never)
const toProject = (id: string) => router.push(`/pm/projects/${id}` as never)

export function PmHomeScreen() {
  const { t } = useTranslation()
  const today = useTodayCaption()
  const user = useAuthStore((s) => s.user)
  const { c, shadow } = useWkPalette()
  const load = useCallback(() => loadOverview(), [])
  const remote = useRemoteData(load, { cacheKey: cacheKeys.dashboardPm })

  const data = remote.status === 'success' ? remote.data : null
  const counts = data?.summary?.counts
  const total = data?.summary?.total ?? data?.projects.length ?? 0
  const onHold = counts?.ON_HOLD ?? 0
  const firstOnHold = data?.projects.find((p) => p.status === 'ON_HOLD')

  const stats: { label: string; value: number | null; dot: string; status: ProjectStatus }[] = [
    {
      label: t('pmHome.active'),
      value: counts?.IN_PROGRESS ?? null,
      dot: '#22A35A',
      status: 'IN_PROGRESS',
    },
    {
      label: t('pmHome.onHold'),
      value: counts?.ON_HOLD ?? null,
      dot: '#E0A33A',
      status: 'ON_HOLD',
    },
    {
      label: t('pmHome.completed'),
      value: counts?.COMPLETED ?? null,
      dot: '#9EA29B',
      status: 'COMPLETED',
    },
  ]

  return (
    <WkTabScroll
      testID="e2e-pm-dashboard"
      refreshing={remote.isFetching && Boolean(data)}
      onRefresh={() => remote.refetch()}
    >
      {/* Date + greeting, new project */}
      <View className="flex-row items-center justify-between gap-3 px-1 pt-1">
        <View className="min-w-0 flex-1 gap-1.5">
          <WkEyebrow>{today}</WkEyebrow>
          <Text className="text-[15px] font-medium text-wk-ink2" numberOfLines={1}>
            {t('dashboard.greeting', { name: user ? userFirstName(user) : t('dashboard.there') })}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('pmHome.newProject')}
          onPress={toNewProject}
          className="size-11 items-center justify-center rounded-full bg-wk-ink active:opacity-80"
        >
          <Plus size={20} color={c.bg} strokeWidth={2.2} />
        </Pressable>
      </View>

      {remote.status === 'error' && !data ? (
        <WkError
          message={errorMessage(remote.error, t('common.errorGeneric'))}
          onRetry={() => void remote.refetch()}
        />
      ) : null}

      {!data && remote.isLoading ? (
        <>
          <WkSkeletonCard />
          <WkSkeletonCard />
        </>
      ) : null}

      {data && total === 0 ? (
        /* Welcome hero */
        <View className="h-[420px] overflow-hidden rounded-[28px] bg-wk-hero">
          <WkHeroGlow size={360} />
          <Animated.View
            entering={FadeIn.duration(400)}
            className="absolute inset-x-5 bottom-5 gap-3.5"
          >
            <Text
              className="text-[11px] font-medium uppercase"
              style={[MONO_STYLE, { color: 'rgba(255,255,255,0.72)' }]}
            >
              {t('pmPortal.welcome')}
            </Text>
            <Text className="text-[26px] font-semibold leading-[30px] text-white">
              {t('pmPortal.welcomeTitle')}
            </Text>
            <Text className="text-[15px] leading-[22px]" style={{ color: 'rgba(255,255,255,0.8)' }}>
              {t('pmPortal.welcomeBody')}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={toNewProject}
              className="h-[52px] flex-row items-center justify-center gap-2 rounded-2xl bg-white active:opacity-85"
            >
              <Plus size={18} color="#0A1F12" strokeWidth={2} />
              <Text className="text-[15px] font-semibold" style={{ color: '#0A1F12' }}>
                {t('pmHome.newProject')}
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      ) : null}

      {data && total > 0 ? (
        <>
          {/* Stats */}
          <View className="flex-row gap-2.5">
            {stats.map((stat) => (
              <Pressable
                key={stat.status}
                accessibilityRole="button"
                accessibilityLabel={`${stat.label}: ${stat.value ?? '—'}`}
                onPress={() => toProjects(stat.status)}
                className="flex-1 items-start gap-2.5 rounded-[18px] bg-wk-sf p-3.5 active:opacity-80"
                style={shadow}
              >
                <View className="flex-row items-center gap-1.5">
                  <View className="size-1.5 rounded-full" style={{ backgroundColor: stat.dot }} />
                  <WkEyebrow>{stat.label}</WkEyebrow>
                </View>
                <Text
                  className="text-[26px] font-semibold text-wk-ink"
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  {stat.value ?? '—'}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* On-hold banner */}
          {onHold > 0 ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => toProjects('ON_HOLD')}
              className="flex-row items-center gap-3 rounded-[18px] bg-wk-amber-soft px-4 py-3.5 active:opacity-85"
            >
              <View className="size-9 items-center justify-center rounded-[10px] bg-wk-sf">
                <CirclePause size={18} color={c.amber} strokeWidth={1.9} />
              </View>
              <View className="min-w-0 flex-1 gap-0.5">
                <Text className="text-[15px] font-semibold text-wk-amber">
                  {t('pmPortal.onHoldTitle', { count: onHold })}
                </Text>
                <Text className="text-[13px] text-wk-ink2" numberOfLines={2}>
                  {firstOnHold?.notes?.trim() || t('pmPortal.onHoldBody')}
                </Text>
              </View>
              <View style={flipStyle()}>
                <ChevronRight size={18} color={c.amber} />
              </View>
            </Pressable>
          ) : null}

          {/* Active projects carousel */}
          {data.active.length > 0 ? (
            <View className="gap-3">
              <View className="px-1 pt-2">
                <WkEyebrow>{t('pmPortal.activeProjects')}</WkEyebrow>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="-mx-5"
                contentContainerClassName="gap-3 px-5 pb-2"
                snapToInterval={CARD_WIDTH + 12}
                decelerationRate="fast"
              >
                {data.active.map(({ project, stages }) => {
                  const cur = currentStage(stages)
                  return (
                    <Pressable
                      key={project.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${project.name}, ${Math.round(project.progress)}%`}
                      onPress={() => toProject(project.id)}
                      className="h-[348px] overflow-hidden rounded-[26px] bg-wk-hero active:opacity-95"
                      style={{ width: CARD_WIDTH }}
                    >
                      {project.mainImageUrl ? (
                        <Image
                          source={remoteImage(project.mainImageUrl, project.mainImageKey)}
                          cachePolicy={REMOTE_IMAGE_CACHE_POLICY}
                          style={{ position: 'absolute', inset: 0 }}
                          contentFit="cover"
                          transition={250}
                        />
                      ) : (
                        <WkHeroGlow size={300} />
                      )}
                      <PhotoScrim
                        id={`pmCard${project.id}`}
                        stops={[
                          [0, 0.35],
                          [0.28, 0],
                          [0.5, 0.15],
                          [1, 0.94],
                        ]}
                      />
                      <View className="absolute inset-x-4 top-4 flex-row items-center justify-between">
                        <View
                          className="h-7 flex-row items-center gap-1.5 rounded-full px-2.5"
                          style={{ backgroundColor: 'rgba(10,12,10,0.55)' }}
                        >
                          <View
                            className="size-1.5 rounded-full"
                            style={{ backgroundColor: PHOTO_DOT[project.status] }}
                          />
                          <Text className="text-xs font-medium text-white">
                            {cur ? enumLabel(t, 'stage', cur) : t('stages.complete')}
                          </Text>
                        </View>
                        {project.code ? (
                          <Text
                            className="text-[11px] font-medium"
                            style={[MONO_STYLE, { color: 'rgba(255,255,255,0.85)' }]}
                          >
                            {ltr(project.code)}
                          </Text>
                        ) : null}
                      </View>
                      <View className="absolute inset-x-[18px] bottom-[18px] gap-3">
                        <View className="flex-row items-end justify-between gap-3">
                          <View className="min-w-0 flex-1 gap-1">
                            <Text
                              className="text-[19px] font-semibold leading-6 text-white"
                              numberOfLines={2}
                            >
                              {project.name}
                            </Text>
                            <Text
                              className="text-[13px]"
                              style={{ color: 'rgba(255,255,255,0.75)' }}
                              numberOfLines={1}
                            >
                              {project.city || projectStatusLabel(t, project.status)}
                            </Text>
                          </View>
                          <Text
                            className="text-[40px] font-semibold text-white"
                            style={{ fontVariant: ['tabular-nums'], lineHeight: 42 }}
                          >
                            {Math.round(project.progress)}
                            <Text className="text-lg" style={{ opacity: 0.7 }}>
                              %
                            </Text>
                          </Text>
                        </View>
                        <StageSegments states={stageStates(stages)} />
                      </View>
                    </Pressable>
                  )
                })}
              </ScrollView>
            </View>
          ) : null}
        </>
      ) : null}

      {/* Quick actions */}
      <View className="flex-row gap-2.5">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('pmHome.newProject')}
          onPress={toNewProject}
          className="min-h-24 items-start justify-between gap-2.5 rounded-[18px] bg-wk-ink p-3.5 active:opacity-85"
          style={{ flex: 1.25 }}
        >
          <View className="size-9 items-center justify-center rounded-[11px] bg-wk-brand">
            <Plus size={19} color="#FFFFFF" strokeWidth={2.2} />
          </View>
          <Text className="text-[15px] font-semibold leading-[18px] text-wk-bg">
            {t('pmHome.newProject')}
          </Text>
        </Pressable>
        {[
          { label: t('pmHome.allProjects'), icon: FolderKanban, onPress: () => toProjects() },
          {
            label: t('pmHome.directory'),
            icon: ContactRound,
            onPress: () => router.replace('/pm/directory' as never),
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

      {/* Recent */}
      {data && data.projects.length > 0 ? (
        <View className="gap-3">
          <PvSectionHead
            label={<WkEyebrow>{t('pmPortal.recent')}</WkEyebrow>}
            action={{ label: t('common.seeAll'), onPress: () => toProjects() }}
          />
          <WkGroup>
            {data.projects.slice(0, 4).map((project) => (
              <ProjectGroupRow
                key={project.id}
                project={project}
                onPress={() => toProject(project.id)}
              />
            ))}
          </WkGroup>
        </View>
      ) : null}
    </WkTabScroll>
  )
}
