import { useCallback, useEffect, useMemo, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import {
  ArrowRight,
  Check,
  FolderOpen,
  type LucideIcon,
  Mountain,
  NotebookPen,
  Package,
  PenTool,
  Stamp,
  Wrench,
} from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { Pressable } from '@/components/ui/pressable'
import { DesignStageRequestsBlock } from '@/features/design-requests/DesignStageRequestsBlock'
import { isIsoDate } from '@/features/pm/projectForm'
import { draftFromSummary, fieldsForStage, fileFieldsForStage } from '@/features/pm/stageFields'
import { saveStageDraft, type StageDraft } from '@/features/pm/stagePayloads'
import { type StageState, stageStateOf } from '@/features/pm/ui/kit'
import { StageDocRow } from '@/features/pm/ui/StageDocRow'
import { WkChoice, WkField, WkFormScreen, WkSection } from '@/components/wk/forms'
import { WkButton } from '@/components/wk/kit'
import { useHandleApiError } from '@/hooks/useHandleApiError'
import { useRemoteData } from '@/hooks/useRemoteData'
import { useSeedOnce } from '@/hooks/useSeedOnce'
import { enumLabel, enumOptions } from '@/i18n/labels'
import { cacheKeys, invalidateProjectCaches } from '@/lib/cacheKeys'
import { ltr } from '@/lib/rtl'
import {
  getProjectDetail,
  PROJECT_STAGE_STATUS_OPTIONS,
  STAGE_KEYS,
  type StageKey,
} from '@/services/project-stages'
import { useToastSuccess } from '@/services/toast'

const DEFAULT_BASE = '/pm/projects'

const STAGE_ICON: Record<StageKey, LucideIcon> = {
  geotechnical: Mountain,
  design: PenTool,
  licensing: Stamp,
  materials: Package,
  maintenance: Wrench,
}

/** Number-only stage fields (validated, decimal keyboard, LTR). */
const NUMERIC = new Set([
  'soilBearingCapacity',
  'groundwaterLevel',
  'quantity',
  'totalCost',
  'cost',
])
const isDateField = (key: string) => /Date$/.test(key)
const NUMBER = /^-?\d+(\.\d+)?$/

/** Stage labels carry a "(YYYY-MM-DD)" hint; the placeholder shows it instead. */
const cleanLabel = (label: string) => label.replace(/\s*\((YYYY-MM-DD|[^)]*YYYY[^)]*)\)\s*$/, '')

function validateDraft(t: (k: string) => string, key: StageKey, draft: StageDraft) {
  const errors: Record<string, string> = {}
  for (const field of fieldsForStage(key)) {
    const value = draft[field.key]?.trim()
    if (!value) continue
    if (isDateField(field.key) && !isIsoDate(value)) errors[field.key] = t('pmPortal.dateFormat')
    if (NUMERIC.has(field.key) && !NUMBER.test(value.replace(/,/g, '')))
      errors[field.key] = t('pmPortal.numbersOnly')
  }
  return errors
}

/** Five stage cards: check when done, amber ring while in progress. */
function Stepper({
  active,
  states,
  onSelect,
}: {
  active: StageKey
  states: Record<StageKey, StageState>
  onSelect: (key: StageKey) => void
}) {
  const { t } = useTranslation()
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="-mx-5 grow-0"
      contentContainerClassName="gap-2 px-5 pb-1 pt-0.5"
      accessibilityRole="tablist"
    >
      {STAGE_KEYS.map((key, i) => {
        const on = key === active
        const state = states[key]
        const done = state === 'done'
        const started = state === 'started'
        return (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${i + 1}. ${enumLabel(t, 'stage', key)}`}
            onPress={() => onSelect(key)}
            className={`w-[132px] gap-2.5 rounded-[18px] border-[1.5px] p-3 ${
              on ? 'border-wk-brand bg-wk-sf' : 'border-wk-line'
            }`}
          >
            <View
              className={`size-[30px] items-center justify-center rounded-full ${
                done
                  ? 'bg-wk-brand'
                  : started
                    ? 'border-2 border-wk-amber'
                    : 'border-2 border-wk-line2'
              }`}
            >
              {done ? (
                <Check size={15} color="#FFFFFF" strokeWidth={2.6} />
              ) : (
                <Text
                  className={`text-[13px] font-semibold ${started ? 'text-wk-amber' : 'text-wk-ink3'}`}
                >
                  {i + 1}
                </Text>
              )}
            </View>
            <View className="gap-[3px]">
              <Text className="text-[13px] font-semibold text-wk-ink" numberOfLines={1}>
                {enumLabel(t, 'stage', key)}
              </Text>
              <Text
                className={`text-[11px] font-medium ${
                  done ? 'text-wk-brand' : started ? 'text-wk-amber' : 'text-wk-ink3'
                }`}
                numberOfLines={1}
              >
                {done
                  ? t('stages.complete')
                  : started
                    ? t('stages.inProgress')
                    : t('stages.notStarted')}
              </Text>
            </View>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

/** PM stages editor: stepper, stage fields, documents, notes; save & next. */
export function PmStagesScreen({ basePath = DEFAULT_BASE }: { basePath?: string } = {}) {
  const BASE = basePath
  const { t } = useTranslation()
  const handleApiError = useHandleApiError()
  const toastSuccess = useToastSuccess()
  const { id, stage } = useLocalSearchParams<{ id: string; stage?: string }>()
  const projectId = typeof id === 'string' ? id : id?.[0]

  const [activeKey, setActiveKey] = useState<StageKey>(
    STAGE_KEYS.includes(stage as StageKey) ? (stage as StageKey) : 'geotechnical',
  )
  const [draft, setDraft] = useState<StageDraft>({ status: 'NOT_STARTED' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [jumped, setJumped] = useState(Boolean(stage))

  const load = useCallback(() => {
    if (!projectId) return Promise.reject(new Error('Project id required'))
    return getProjectDetail(projectId)
  }, [projectId])
  const remote = useRemoteData(load, {
    enabled: Boolean(projectId),
    cacheKey: projectId ? `${cacheKeys.projectDetail}:${projectId}` : undefined,
  })
  const projectCode = remote.status === 'success' ? remote.data.data.project.code : null
  const summary = remote.status === 'success' ? remote.data.data.stages : null

  const states = useMemo(
    () =>
      Object.fromEntries(STAGE_KEYS.map((k) => [k, stageStateOf(summary, k)])) as Record<
        StageKey,
        StageState
      >,
    [summary],
  )

  // Open on the first unfinished stage, once.
  useEffect(() => {
    if (!summary || jumped) return
    setJumped(true)
    const first = STAGE_KEYS.find((k) => stageStateOf(summary, k) !== 'done')
    if (first) setActiveKey(first)
  }, [summary, jumped])

  // Seed the draft once per stage: switching stage loads that stage's saved values,
  // but a background refetch of the (cached) summary must not wipe unsaved edits.
  useSeedOnce(
    summary,
    (s) => {
      setDraft(draftFromSummary(s, activeKey))
      setErrors({})
    },
    activeKey,
  )

  const index = STAGE_KEYS.indexOf(activeKey)
  const isLast = index === STAGE_KEYS.length - 1
  const fields = useMemo(() => fieldsForStage(activeKey), [activeKey])
  const fileFields = useMemo(() => fileFieldsForStage(activeKey), [activeKey])
  const mainFields = fields.filter((f) => f.key !== 'notes')
  const uploaded = fileFields.filter((f) => draft[f]).length

  const setField = (key: string) => (value: string) => {
    setDraft((d) => ({ ...d, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }))
  }

  async function persist(next: boolean) {
    if (!projectId) return
    const e = validateDraft(t, activeKey, draft)
    if (Object.keys(e).length) {
      setErrors(e)
      return
    }
    setIsSaving(true)
    try {
      const saved = await saveStageDraft(projectId, activeKey, draft)
      const nextToken = saved.data.updatedAt
      if (nextToken) {
        setDraft((d) => ({ ...d, expectedUpdatedAt: nextToken }))
      }
      invalidateProjectCaches()
      const wasAllDone = STAGE_KEYS.every((k) => states[k] === 'done')
      const nowAllDone =
        draft.status === 'COMPLETED' &&
        STAGE_KEYS.every((k) => k === activeKey || states[k] === 'done')
      void remote.refetch()
      if (nowAllDone && !wasAllDone) {
        toastSuccess(t('pmPortal.allStagesToast'))
      } else if (!next || isLast) {
        toastSuccess(t('stages.saved', { stage: enumLabel(t, 'stage', activeKey) }))
      }
      if (next && !isLast) setActiveKey(STAGE_KEYS[index + 1]!)
    } catch (err) {
      handleApiError(err, t('stages.saveFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  const StageIcon = STAGE_ICON[activeKey]

  return (
    <WkFormScreen
      title={t('stages.title')}
      count={projectCode ? ltr(projectCode) : undefined}
      backHref={`${BASE}/${projectId ?? ''}`}
      isLoading={remote.isLoading && !summary}
      error={remote.status === 'error' ? remote.error : undefined}
      onRetry={() => {
        void remote.refetch()
      }}
      testID="e2e-pm-stages"
      footer={
        <View className="flex-row gap-2.5">
          {!isLast ? (
            <View className="flex-1">
              <WkButton
                variant="soft"
                height={54}
                label={t('common.save')}
                disabled={isSaving}
                onPress={() => void persist(false)}
              />
            </View>
          ) : null}
          <View style={{ flex: 1.4 }}>
            <WkButton
              height={54}
              label={isLast ? t('pmPortal.saveStages') : t('stages.saveNext')}
              icon={isLast ? undefined : ArrowRight}
              iconAfter
              loading={isSaving}
              onPress={() => void persist(!isLast)}
            />
          </View>
        </View>
      }
    >
      <Stepper active={activeKey} states={states} onSelect={setActiveKey} />

      {activeKey === 'design' && projectId ? (
        <DesignStageRequestsBlock
          projectId={projectId}
          basePath={BASE.startsWith('/admin') ? '/admin/projects' : '/pm/projects'}
        />
      ) : null}

      <WkSection icon={StageIcon} title={`${index + 1} · ${enumLabel(t, 'stage', activeKey)}`}>
        <WkChoice
          label={t('stages.status')}
          options={enumOptions(t, 'stageStatus', PROJECT_STAGE_STATUS_OPTIONS)}
          value={draft.status ?? 'NOT_STARTED'}
          onChange={setField('status')}
        />
        {mainFields.map((field) => {
          const isDate = isDateField(field.key)
          const isNum = NUMERIC.has(field.key)
          return (
            <WkField
              key={`${activeKey}-${field.key}`}
              label={cleanLabel(t(`stageFields.${field.key}`))}
              value={draft[field.key] ?? ''}
              onChangeText={setField(field.key)}
              multiline={field.multiline}
              error={errors[field.key] || undefined}
              placeholder={isDate ? 'YYYY-MM-DD' : isNum ? '0' : undefined}
              keyboardType={isNum ? 'decimal-pad' : 'default'}
              autoCapitalize={isDate || isNum ? 'none' : 'sentences'}
              maxLength={isDate ? 10 : undefined}
              ltr={isDate || isNum}
            />
          )
        })}
      </WkSection>

      {projectId ? (
        <WkSection icon={FolderOpen} title={t('stages.documents')}>
          <Text className="-mt-2 text-[11px] font-medium text-wk-ink3">
            {ltr(`${uploaded} / ${fileFields.length}`)}
          </Text>
          <View className="gap-2">
            {fileFields.map((field) => (
              <StageDocRow
                key={`${activeKey}-${field}`}
                projectId={projectId}
                label={t(`stageFileFields.${field}`)}
                value={draft[field] ?? ''}
                disabled={isSaving}
                onChange={setField(field)}
              />
            ))}
          </View>
        </WkSection>
      ) : null}

      {fields.some((f) => f.key === 'notes') ? (
        <WkSection icon={NotebookPen} title={t('projects.notes')}>
          <WkField
            label={t('pmPortal.stageNotes')}
            multiline
            value={draft.notes ?? ''}
            onChangeText={setField('notes')}
            placeholder={t('pmPortal.stageNotesPlaceholder')}
          />
        </WkSection>
      ) : null}
    </WkFormScreen>
  )
}
