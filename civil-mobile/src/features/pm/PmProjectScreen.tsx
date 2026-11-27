import { useCallback, useState } from 'react'
import { Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import {
  CalendarRange,
  ChevronRight,
  FileText,
  type LucideIcon,
  MapPin,
  Milestone,
  NotebookPen,
} from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import Animated, { FadeInDown } from 'react-native-reanimated'

import { BottomSheet } from '@/components/kit'
import { Pressable } from '@/components/ui/pressable'
import { ProductivityHoursSection } from '@/features/pm/ProductivityHoursSection'
import {
  EMPTY_PROJECT_FORM,
  formFromProject,
  type ProjectFormErrors,
  type ProjectFormValues,
  toApiDate,
  validateProject,
} from '@/features/pm/projectForm'
import {
  currentStage,
  PROJECT_BAR,
  PROJECT_TONE,
  ProjectPill,
  StageSegments,
  stageStateOf,
  stageStates,
} from '@/features/pm/ui/kit'
import { WkChoice, WkDangerZone, WkField, WkFormScreen, WkSection } from '@/components/wk/forms'
import { WkGalleryCard } from '@/components/wk/GalleryCard'
import {
  flipStyle,
  WkButton,
  WkConfirm,
  type WkConfirmState,
  WkEyebrow,
  WkPill,
} from '@/components/wk/kit'
import { useWkPalette } from '@/components/wk/palette'
import { useHandleApiError } from '@/hooks/useHandleApiError'
import { useRemoteData } from '@/hooks/useRemoteData'
import { useSeedOnce } from '@/hooks/useSeedOnce'
import { enumLabel, enumOptions } from '@/i18n/labels'
import { cacheKeys, invalidateProjectCaches } from '@/lib/cacheKeys'
import { ltr } from '@/lib/rtl'
import { getProjectDetail, STAGE_KEYS } from '@/services/project-stages'
import {
  archiveProject,
  type Project,
  PROJECT_STATUS_OPTIONS,
  PROJECT_TYPE_OPTIONS,
  type ProjectStatus,
  type ProjectType,
  updateProject,
} from '@/services/projects'
import { useToastSuccess } from '@/services/toast'
import { MONO_STYLE } from '@/theme/typography'

const DEFAULT_BASE = '/pm/projects'

/** PM project page: photo summary, stages entry, gallery, editable details. */
export function PmProjectScreen({ basePath = DEFAULT_BASE }: { basePath?: string } = {}) {
  const BASE = basePath
  const { t } = useTranslation()
  const { c, shadow } = useWkPalette()
  const handleApiError = useHandleApiError()
  const toastSuccess = useToastSuccess()
  const { id } = useLocalSearchParams<{ id: string }>()
  const projectId = typeof id === 'string' ? id : id?.[0]

  const load = useCallback(() => {
    if (!projectId) return Promise.reject(new Error('Project id required'))
    return getProjectDetail(projectId)
  }, [projectId])
  // One cache entry under `projectDetail` — stage saves call `invalidateProjectCaches()`.
  const remote = useRemoteData(load, {
    enabled: Boolean(projectId),
    cacheKey: projectId ? `${cacheKeys.projectDetail}:${projectId}` : undefined,
  })
  const project = remote.status === 'success' ? remote.data.data.project : null
  const stages = remote.status === 'success' ? remote.data.data.stages : null

  const [form, setForm] = useState<ProjectFormValues>(EMPTY_PROJECT_FORM)
  const [errors, setErrors] = useState<ProjectFormErrors>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [confirm, setConfirm] = useState<WkConfirmState | null>(null)

  // Seed once: the project is cached and refetches in the background.
  useSeedOnce(project, (p) => setForm(formFromProject(p)))

  const set =
    <K extends keyof ProjectFormValues>(key: K) =>
    (value: ProjectFormValues[K]) => {
      setForm((f) => ({ ...f, [key]: value }))
      if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
    }

  async function onSave() {
    if (!projectId) return
    const e = validateProject(t, form)
    if (Object.keys(e).length) {
      setErrors(e)
      return
    }
    setIsSaving(true)
    try {
      const current = remote.status === 'success' ? remote.data.data.project : null
      if (!current) return
      await updateProject(projectId, {
        expectedUpdatedAt: current.updatedAt,
        name: form.name.trim(),
        code: form.code.trim(),
        // '' clears the column (backend maps blank → null); undefined would leave it unchanged.
        description: form.description.trim(),
        type: form.type || undefined,
        status: form.status,
        address: form.address.trim(),
        city: form.city.trim(),
        country: form.country.trim(),
        startDate: toApiDate(form.startDate),
        endDate: toApiDate(form.endDate),
        notes: form.notes.trim(),
      })
      invalidateProjectCaches()
      toastSuccess(t('projects.saved'))
      await remote.refetch()
    } catch (err) {
      handleApiError(err, t('projects.saveFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  function askArchive() {
    if (!projectId || !project) return
    setConfirm({
      title: t('projects.archiveTitle'),
      body: t('pmPortal.archiveBody', { name: project.name }),
      cta: t('projects.archive'),
      onConfirm: () => {
        setConfirm(null)
        void (async () => {
          setIsArchiving(true)
          try {
            await archiveProject(projectId)
            invalidateProjectCaches()
            toastSuccess(t('projects.archived'))
            router.replace(BASE as never)
          } catch (err) {
            handleApiError(err, t('projects.archiveFailed'))
          } finally {
            setIsArchiving(false)
          }
        })()
      },
    })
  }

  const pct = Math.round(project?.progress ?? 0)
  const done = STAGE_KEYS.filter((k) => stageStateOf(stages, k) === 'done').length
  const cur = currentStage(stages)
  const stageLine = !stages
    ? t('projects.stagesHint')
    : cur == null
      ? t('pmPortal.allStagesDone')
      : t(
          stageStateOf(stages, cur) === 'started'
            ? 'pmPortal.stageLineIn'
            : 'pmPortal.stageLineNext',
          {
            done,
            stage: enumLabel(t, 'stage', cur),
          },
        )

  const locationLine = [project?.city, project?.country].filter(Boolean).join(', ')
  const scheduleLine = [project?.startDate, project?.endDate]
    .filter(Boolean)
    .map((d) => ltr(String(d).slice(0, 10)))
    .join(' → ')

  const date = {
    placeholder: 'YYYY-MM-DD',
    ltr: true,
    autoCapitalize: 'none' as const,
    maxLength: 10,
  }

  return (
    <WkFormScreen
      title={project?.name ?? t('projects.project')}
      count={project?.code ? ltr(project.code) : undefined}
      backHref={BASE}
      isLoading={remote.isLoading && !project}
      error={remote.status === 'error' ? remote.error : undefined}
      onRetry={() => void remote.refetch()}
      testID="e2e-pm-project"
      footer={
        project ? (
          <WkButton
            label={isSaving ? t('common.saving') : t('worker.saveChanges')}
            loading={isSaving}
            height={54}
            onPress={() => void onSave()}
          />
        ) : undefined
      }
    >
      {project ? (
        <>
          <WkGalleryCard
            kind="project"
            ownerId={project.id}
            previewHeight={220}
            onMainChange={() => void remote.refetch()}
          />

          <ProjectOverviewCard
            project={project}
            pct={pct}
            stageLine={stageLine}
            locationLine={locationLine}
            scheduleLine={scheduleLine}
          />

          {/* Stages entry */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t('stages.title')}. ${stageLine}`}
            onPress={() => router.push(`${BASE}/${project.id}/stages` as never)}
            className="gap-3.5 rounded-[22px] border border-wk-line bg-wk-sf p-[18px] active:opacity-90"
            style={shadow}
          >
            <View className="flex-row items-center gap-3">
              <View className="size-10 items-center justify-center rounded-xl bg-wk-brand-soft">
                <Milestone size={19} color={c.brand} strokeWidth={1.9} />
              </View>
              <View className="min-w-0 flex-1 gap-0.5">
                <Text className="text-[15px] font-semibold text-wk-ink">{t('stages.title')}</Text>
                <Text className="text-[13px] text-wk-ink2" numberOfLines={2}>
                  {stageLine}
                </Text>
              </View>
              <View style={flipStyle()}>
                <ChevronRight size={20} color={c.ink3} />
              </View>
            </View>
            <StageSegments states={stageStates(stages)} tone="surface" />
          </Pressable>

          <WkSection icon={FileText} title={t('pmPortal.basics')}>
            <WkField
              label={t('projects.name')}
              required
              value={form.name}
              onChangeText={set('name')}
              error={errors.name}
            />
            <WkField
              label={t('pmPortal.code')}
              value={form.code}
              onChangeText={set('code')}
              autoCapitalize="characters"
              ltr
            />
            <WkChoice
              label={t('projects.type')}
              options={enumOptions(t, 'projectType', PROJECT_TYPE_OPTIONS)}
              value={form.type}
              onChange={(v) => set('type')(v as ProjectType)}
            />
            <WkChoice
              label={t('projects.status')}
              options={enumOptions(t, 'projectStatus', PROJECT_STATUS_OPTIONS)}
              value={form.status}
              onChange={(v) => set('status')(v as ProjectStatus)}
            />
            <WkField
              label={t('common.description')}
              multiline
              value={form.description}
              onChangeText={set('description')}
            />
          </WkSection>

          <WkSection icon={MapPin} title={t('projects.location')}>
            <WkField
              label={t('common.address')}
              value={form.address}
              onChangeText={set('address')}
              placeholder={t('pmPortal.addressPlaceholder')}
            />
            <WkField label={t('common.city')} value={form.city} onChangeText={set('city')} />
            <WkField
              label={t('common.country')}
              value={form.country}
              onChangeText={set('country')}
            />
            <WkField
              label={t('projects.start')}
              value={form.startDate}
              onChangeText={set('startDate')}
              error={errors.startDate}
              {...date}
            />
            <WkField
              label={t('projects.end')}
              value={form.endDate}
              onChangeText={set('endDate')}
              error={errors.endDate}
              {...date}
            />
          </WkSection>

          <WkSection icon={NotebookPen} title={t('projects.notes')}>
            <WkField
              label={t('projects.notes')}
              multiline
              value={form.notes}
              onChangeText={set('notes')}
              placeholder={t('pmPortal.notesPlaceholder')}
            />
          </WkSection>

          <ProductivityHoursSection projectId={project.id} />

          <WkDangerZone
            title={t('projects.dangerZone')}
            body={t('projects.dangerHint')}
            label={t('projects.archive')}
            disabled={isArchiving}
            onPress={askArchive}
          />
        </>
      ) : null}

      <WkConfirm state={confirm} onCancel={() => setConfirm(null)} />
    </WkFormScreen>
  )
}

type OverviewFact = { icon: LucideIcon; label: string; value: string; ltr?: boolean }

/** Compact project identity + progress + key facts (below the gallery). */
function ProjectOverviewCard({
  project,
  pct,
  stageLine,
  locationLine,
  scheduleLine,
}: {
  project: Project
  pct: number
  stageLine: string
  locationLine: string
  scheduleLine: string
}) {
  const { t } = useTranslation()
  const { c, shadow } = useWkPalette()
  const tone = PROJECT_TONE[project.status]
  const [tip, setTip] = useState<OverviewFact | null>(null)

  const facts: OverviewFact[] = [
    ...(locationLine || project.address?.trim()
      ? [
          {
            icon: MapPin,
            label: t('common.location'),
            value: [project.address?.trim() || null, locationLine || null]
              .filter(Boolean)
              .join(' · '),
          },
        ]
      : []),
    ...(scheduleLine
      ? [
          {
            icon: CalendarRange,
            label: t('projects.schedule'),
            value: scheduleLine,
            ltr: true,
          },
        ]
      : []),
  ]

  return (
    <>
      <Animated.View
        entering={FadeInDown.duration(360).delay(40)}
        className="mt-1 overflow-hidden rounded-[22px] border border-wk-line bg-wk-sf"
        style={shadow}
      >
        <View className="gap-4 px-4 pb-4 pt-5">
          <View className="flex-row flex-wrap items-center gap-2">
            <ProjectPill status={project.status} />
            {project.type ? (
              <WkPill label={enumLabel(t, 'projectType', project.type)} tone="neutral" />
            ) : null}
          </View>

          <View className="gap-3">
            <View className="flex-row items-end justify-between gap-3">
              <View className="min-w-0 flex-1 gap-1">
                <WkEyebrow>{t('projects.progress')}</WkEyebrow>
                <Text className="text-[14px] leading-5 text-wk-ink2" numberOfLines={2}>
                  {stageLine}
                </Text>
              </View>
              <Text
                className="text-[36px] font-semibold leading-none text-wk-ink"
                style={{ ...MONO_STYLE, fontVariant: ['tabular-nums'] }}
                accessibilityLabel={`${t('projects.progress')} ${pct}%`}
              >
                {pct}
                <Text className="text-[15px] font-semibold text-wk-ink3">%</Text>
              </Text>
            </View>
            <View className="h-2 overflow-hidden rounded-full bg-wk-sf2">
              <View
                className={`h-full rounded-full ${PROJECT_BAR[tone]}`}
                style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
              />
            </View>
          </View>
        </View>

        {facts.length > 0 ? (
          <View className="gap-px border-t border-wk-line bg-wk-line">
            {facts.map((fact) => {
              const display = fact.ltr ? ltr(fact.value) : fact.value
              return (
                <Pressable
                  key={fact.label}
                  accessibilityRole="button"
                  accessibilityLabel={`${fact.label}: ${fact.value}`}
                  onPress={() => setTip(fact)}
                  className="min-h-[52px] flex-row items-center gap-3 bg-wk-sf px-4 active:bg-wk-sf2"
                >
                  <View className="size-9 shrink-0 items-center justify-center rounded-xl bg-wk-sf2">
                    <fact.icon size={16} color={c.ink3} strokeWidth={1.9} />
                  </View>
                  <Text className="shrink-0 text-[13px] text-wk-ink3">{fact.label}</Text>
                  <Text
                    className="min-w-0 flex-1 text-end text-[14px] font-medium text-wk-ink"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {display}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        ) : null}
      </Animated.View>

      <BottomSheet
        visible={Boolean(tip)}
        onClose={() => setTip(null)}
        title={tip?.label}
        maxHeightRatio={0.4}
      >
        {tip ? (
          <Text className="pb-2 text-[16px] leading-6 text-wk-ink">
            {tip.ltr ? ltr(tip.value) : tip.value}
          </Text>
        ) : null}
      </BottomSheet>
    </>
  )
}
