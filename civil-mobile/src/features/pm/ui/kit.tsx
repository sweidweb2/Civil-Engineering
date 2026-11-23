import { Text, View } from 'react-native'
import { Image } from 'expo-image'
import type { TFunction } from 'i18next'
import { FolderKanban } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import Animated, { FadeInDown } from 'react-native-reanimated'

import { Pressable } from '@/components/ui/pressable'
import { WkPill } from '@/features/worker/ui/kit'
import { useWorkerPalette, type WkTone } from '@/features/worker/ui/palette'
import { enumLabel } from '@/i18n/labels'
import { REMOTE_IMAGE_CACHE_POLICY, remoteImage } from '@/lib/imageSource'
import { ltr } from '@/lib/rtl'
import type { ProjectStagesSummary, StageKey } from '@/services/project-stages'
import { STAGE_KEYS } from '@/services/project-stages'
import type { Project, ProjectStatus } from '@/services/projects'
import { MONO_STYLE } from '@/theme/typography'

/**
 * PM-portal pieces from resources/pm/PM Portal.dc.html, on the shared green
 * palette (`wk-*` tokens / useWorkerPalette).
 */

/* ─── Status ───────────────────────────────────────────────────────────── */

export const PROJECT_TONE: Record<ProjectStatus, WkTone> = {
  DRAFT: 'neutral',
  PLANNING: 'teal',
  APPROVED: 'teal',
  IN_PROGRESS: 'green',
  ON_HOLD: 'amber',
  COMPLETED: 'green',
  CANCELLED: 'red',
}

/** Bar fill per status (literal classes so Tailwind sees them). */
const BAR: Record<WkTone, string> = {
  green: 'bg-wk-brand',
  amber: 'bg-wk-amber',
  teal: 'bg-wk-teal',
  red: 'bg-wk-red',
  neutral: 'bg-wk-ink3',
}

/** Dot colors for chips laid over photos (always on a dark translucent chip). */
export const PHOTO_DOT: Record<ProjectStatus, string> = {
  DRAFT: '#B8BCB5',
  PLANNING: '#5BC7DF',
  APPROVED: '#5BC7DF',
  IN_PROGRESS: '#4ADE80',
  ON_HOLD: '#F5B54A',
  COMPLETED: '#86E3A6',
  CANCELLED: '#F27A68',
}

export function projectStatusLabel(t: TFunction, status: ProjectStatus) {
  return enumLabel(t, 'projectStatus', status)
}

export function ProjectPill({ status }: { status: ProjectStatus }) {
  const { t } = useTranslation()
  return <WkPill label={projectStatusLabel(t, status)} tone={PROJECT_TONE[status]} />
}

/* ─── Stages ───────────────────────────────────────────────────────────── */

export type StageState = 'done' | 'started' | 'none'

export function stageStateOf(summary: ProjectStagesSummary | null, key: StageKey): StageState {
  const slot = summary?.[key]
  if (!slot?.exists) return 'none'
  const status = (slot.data as { status?: string } | null)?.status
  if (status === 'COMPLETED' || (!status && slot.isComplete)) return 'done'
  if (status === 'NOT_STARTED') return 'none'
  return 'started'
}

export function stageStates(summary: ProjectStagesSummary | null): StageState[] {
  return STAGE_KEYS.map((key) => stageStateOf(summary, key))
}

/** First stage that isn't done, or null when all five are. */
export function currentStage(summary: ProjectStagesSummary | null): StageKey | null {
  return STAGE_KEYS.find((key) => stageStateOf(summary, key) !== 'done') ?? null
}

/**
 * Five stage segments.
 * `hero` = lime on dark cards; `surface` = brand on light cards (default for forms).
 */
export function StageSegments({
  states,
  tone = 'hero',
}: {
  states: StageState[]
  tone?: 'hero' | 'surface'
}) {
  const { c, isDark } = useWorkerPalette()
  const colors =
    tone === 'surface'
      ? {
          done: c.brand,
          started: isDark ? '#2BB062' : '#86C49A',
          none: c.line2,
        }
      : {
          done: '#86E3A6',
          started: 'rgba(134,227,166,0.45)',
          none: 'rgba(255,255,255,0.18)',
        }

  return (
    <View className="flex-row gap-1">
      {states.map((state, i) => (
        <View
          key={i}
          className="h-[5px] flex-1 rounded-[3px]"
          style={{
            backgroundColor:
              state === 'done' ? colors.done : state === 'started' ? colors.started : colors.none,
          }}
        />
      ))}
    </View>
  )
}

/* ─── Progress ─────────────────────────────────────────────────────────── */

/** Thin status-colored bar with the percent in mono. */
export function ProgressLine({ value, status }: { value: number; status: ProjectStatus }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <View className="flex-row items-center gap-2.5">
      <View className="h-[5px] flex-1 overflow-hidden rounded-[3px] bg-wk-sf2">
        <View
          className={`h-full rounded-[3px] ${BAR[PROJECT_TONE[status]]}`}
          style={{ width: `${pct}%` }}
        />
      </View>
      <Text
        className="min-w-[30px] text-end text-[11px] font-medium text-wk-ink3"
        style={MONO_STYLE}
      >
        {pct}%
      </Text>
    </View>
  )
}

/* ─── Photos ───────────────────────────────────────────────────────────── */

export function ProjectThumb({
  uri,
  cacheKey,
  size,
}: {
  uri?: string | null
  /** Stable image key (`mainImageKey`). */
  cacheKey?: string | null
  size: number
}) {
  const { c } = useWorkerPalette()
  return (
    <View
      className="items-center justify-center overflow-hidden bg-wk-sf2"
      style={{ width: size, height: size, borderRadius: size * 0.22 }}
    >
      {uri ? (
        <Image
          source={remoteImage(uri, cacheKey)}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={150}
          cachePolicy={REMOTE_IMAGE_CACHE_POLICY}
          recyclingKey={cacheKey ?? uri}
        />
      ) : (
        <FolderKanban size={size * 0.36} color={c.ink3} strokeWidth={1.6} />
      )}
    </View>
  )
}

/* ─── Rows ─────────────────────────────────────────────────────────────── */

/** Card row for the Projects tab: thumb, name + pill, code · city, progress. */
export function ProjectCard({
  project,
  onPress,
  index = 0,
}: {
  project: Project
  onPress: () => void
  index?: number
}) {
  const { t } = useTranslation()
  const { shadow } = useWorkerPalette()
  return (
    <Animated.View entering={FadeInDown.duration(320).delay(Math.min(index, 8) * 30)}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${project.name}, ${projectStatusLabel(t, project.status)}`}
        onPress={onPress}
        className="flex-row gap-3.5 rounded-[22px] bg-wk-sf p-3 active:opacity-90"
        style={shadow}
      >
        <ProjectThumb uri={project.mainImageUrl} cacheKey={project.mainImageKey} size={80} />
        <View className="min-w-0 flex-1 gap-1.5 pe-0.5 pt-0.5">
          <View className="flex-row items-start gap-2">
            <Text
              className="min-w-0 flex-1 text-[15px] font-semibold leading-5 text-wk-ink"
              numberOfLines={2}
            >
              {project.name}
            </Text>
            <ProjectPill status={project.status} />
          </View>
          <Text className="text-[13px] text-wk-ink3" numberOfLines={1}>
            {[project.code ? ltr(project.code) : null, project.city].filter(Boolean).join(' · ') ||
              '—'}
          </Text>
          <View className="mt-auto">
            <ProgressLine value={project.progress} status={project.status} />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  )
}

/** Compact row inside a grouped card (Home "Recent"). */
export function ProjectGroupRow({ project, onPress }: { project: Project; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={project.name}
      onPress={onPress}
      className="flex-row items-center gap-3.5 bg-wk-sf py-3 pe-3.5 ps-3 active:bg-wk-sf2"
    >
      <ProjectThumb uri={project.mainImageUrl} cacheKey={project.mainImageKey} size={56} />
      <View className="min-w-0 flex-1 gap-[7px]">
        <View className="flex-row items-center gap-2">
          <Text className="min-w-0 flex-1 text-[15px] font-semibold text-wk-ink" numberOfLines={1}>
            {project.name}
          </Text>
          <ProjectPill status={project.status} />
        </View>
        <ProgressLine value={project.progress} status={project.status} />
      </View>
    </Pressable>
  )
}

/** Loading placeholder shaped like ProjectCard. */
export function ProjectCardSkeleton() {
  return (
    <View className="h-[104px] flex-row gap-3.5 rounded-[22px] bg-wk-sf p-3 opacity-70">
      <View className="size-20 rounded-2xl bg-wk-sf2" />
      <View className="flex-1 gap-2.5 pt-2">
        <View className="h-3 w-[70%] rounded-md bg-wk-sf2" />
        <View className="h-2.5 w-[40%] rounded bg-wk-sf2" />
        <View className="mt-2 h-1.5 w-[90%] rounded-[3px] bg-wk-sf2" />
      </View>
    </View>
  )
}
