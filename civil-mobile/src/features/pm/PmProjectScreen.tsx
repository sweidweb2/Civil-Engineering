import { useCallback, useEffect, useRef, useState } from 'react'
import { Text, View } from 'react-native'
import { Image } from 'expo-image'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { ChevronRight, FileText, MapPin, Milestone, NotebookPen } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { Pressable } from '@/components/ui/pressable'
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
  PHOTO_DOT,
  projectStatusLabel,
  StageSegments,
  stageStateOf,
  stageStates,
} from '@/features/pm/ui/kit'
import { PhotoScrim } from '@/features/provider/ui/kit'
import {
  WkChoice,
  WkDangerZone,
  WkField,
  WkFormScreen,
  WkSection,
} from '@/features/worker/ui/forms'
import { WkGalleryCard } from '@/features/worker/ui/GalleryCard'
import {
  flipStyle,
  WkButton,
  WkConfirm,
  type WkConfirmState,
  WkHeroGlow,
} from '@/features/worker/ui/kit'
import { useWorkerPalette } from '@/features/worker/ui/palette'
import { useHandleApiError } from '@/hooks/useHandleApiError'
import { useRemoteData } from '@/hooks/useRemoteData'
import { enumLabel, enumOptions } from '@/i18n/labels'
import { invalidateProjectCaches } from '@/lib/cacheKeys'
import { ltr } from '@/lib/rtl'
import { getProjectStagesSummary, STAGE_KEYS } from '@/services/project-stages'
import {
  archiveProject,
  getProjectById,
  PROJECT_STATUS_OPTIONS,
  PROJECT_TYPE_OPTIONS,
  type ProjectStatus,
  type ProjectType,
  updateProject,
} from '@/services/projects'
import { useToastSuccess } from '@/services/toast'

const DEFAULT_BASE = '/pm/projects'

/** PM project page: photo summary, stages entry, gallery, editable details. */
export function PmProjectScreen({ basePath = DEFAULT_BASE }: { basePath?: string } = {}) {
  const BASE = basePath
  const { t } = useTranslation()
  const { c } = useWorkerPalette()
  const handleApiError = useHandleApiError()
  const toastSuccess = useToastSuccess()
  const { id } = useLocalSearchParams<{ id: string }>()
  const projectId = typeof id === 'string' ? id : id?.[0]

  const load = useCallback(() => {
    if (!projectId) return Promise.reject(new Error('Project id required'))
    return getProjectById(projectId)
  }, [projectId])
  const remote = useRemoteData(load, { enabled: Boolean(projectId) })
  const project = remote.status === 'success' ? remote.data.data : null

  // Stages load separately and refresh whenever the screen regains focus
  // (coming back from the Stages editor), without touching the edit form.
  const loadStages = useCallback(() => {
    if (!projectId) return Promise.reject(new Error('Project id required'))
    return getProjectStagesSummary(projectId)
  }, [projectId])
  const stagesRemote = useRemoteData(loadStages, { enabled: Boolean(projectId) })
  const stages = stagesRemote.status === 'success' ? stagesRemote.data.data : null
  const focusedOnce = useRef(false)
  useFocusEffect(
    useCallback(() => {
      if (focusedOnce.current) void stagesRemote.refetch()
      focusedOnce.current = true
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  )

  const [form, setForm] = useState<ProjectFormValues>(EMPTY_PROJECT_FORM)
  const [errors, setErrors] = useState<ProjectFormErrors>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [confirm, setConfirm] = useState<WkConfirmState | null>(null)

  useEffect(() => {
    if (project) setForm(formFromProject(project))
  }, [project])

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
      await updateProject(projectId, {
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
          {/* Summary */}
          <View className="h-[230px] overflow-hidden rounded-[26px] bg-wk-hero">
            {project.mainImageUrl ? (
              <Image
                source={{ uri: project.mainImageUrl }}
                style={{ position: 'absolute', inset: 0 }}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <WkHeroGlow size={300} />
            )}
            <PhotoScrim
              id="pmSummary"
              stops={[
                [0, 0.2],
                [0.35, 0.1],
                [1, 0.92],
              ]}
            />
            <View
              className="absolute start-3.5 top-3.5 h-7 flex-row items-center gap-1.5 rounded-full px-2.5"
              style={{ backgroundColor: 'rgba(10,12,10,0.55)' }}
            >
              <View
                className="size-1.5 rounded-full"
                style={{ backgroundColor: PHOTO_DOT[project.status] }}
              />
              <Text className="text-xs font-medium text-white">
                {projectStatusLabel(t, project.status)}
              </Text>
            </View>
            <View className="absolute inset-x-[18px] bottom-4 gap-2.5">
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
                    {[project.type ? enumLabel(t, 'projectType', project.type) : null, project.city]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </Text>
                </View>
                <Text
                  className="text-4xl font-semibold text-white"
                  style={{ fontVariant: ['tabular-nums'], lineHeight: 38 }}
                >
                  {pct}
                  <Text className="text-base" style={{ opacity: 0.7 }}>
                    %
                  </Text>
                </Text>
              </View>
              <View
                className="h-1.5 overflow-hidden rounded-[3px]"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                accessibilityRole="progressbar"
                accessibilityValue={{ min: 0, max: 100, now: pct }}
              >
                <View className="h-full rounded-[3px] bg-wk-lime" style={{ width: `${pct}%` }} />
              </View>
            </View>
          </View>

          {/* Stages entry */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t('stages.title')}. ${stageLine}`}
            onPress={() => router.push(`${BASE}/${project.id}/stages` as never)}
            className="gap-3.5 rounded-[22px] bg-wk-hero p-[18px] active:opacity-90"
          >
            <View className="flex-row items-center gap-3">
              <View
                className="size-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: 'rgba(134,227,166,0.16)' }}
              >
                <Milestone size={19} color={c.lime} strokeWidth={1.9} />
              </View>
              <View className="min-w-0 flex-1 gap-0.5">
                <Text className="text-[15px] font-semibold text-wk-hero-ink">
                  {t('stages.title')}
                </Text>
                <Text className="text-[13px] text-wk-hero-mute" numberOfLines={2}>
                  {stageLine}
                </Text>
              </View>
              <View style={flipStyle()}>
                <ChevronRight size={20} color={c.heroMute} />
              </View>
            </View>
            <StageSegments states={stageStates(stages)} />
          </Pressable>

          <WkGalleryCard kind="project" ownerId={project.id} />

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
