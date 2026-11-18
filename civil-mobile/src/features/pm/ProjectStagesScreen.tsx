import { useCallback, useEffect, useMemo, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { Check, Paperclip } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { ChoiceField, FormScreen, Section, TextField } from '@/components/kit'
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button'
import { Pressable } from '@/components/ui/pressable'
import { StageFileField } from '@/features/pm/StageFileField'
import { saveStageDraft, type StageDraft } from '@/features/pm/stagePayloads'
import { useHandleApiError } from '@/hooks/useHandleApiError'
import { useRemoteData } from '@/hooks/useRemoteData'
import { useThemeColors } from '@/hooks/useThemeColors'
import { enumLabel, enumOptions } from '@/i18n/labels'
import {
  getProjectStagesSummary,
  PROJECT_STAGE_STATUS_OPTIONS,
  type ProjectStagesSummary,
  type ProjectStageStatus,
  STAGE_KEYS,
  type StageKey,
} from '@/services/project-stages'
import { getProjectById } from '@/services/projects'
import { useToastSuccess } from '@/services/toast'

function emptyDraft(status: ProjectStageStatus = 'NOT_STARTED'): StageDraft {
  return { status }
}

function draftFromSummary(summary: ProjectStagesSummary, key: StageKey): StageDraft {
  const slot = summary[key]
  if (!slot.data) return emptyDraft()
  const draft: StageDraft = {}
  for (const [field, value] of Object.entries(slot.data)) {
    draft[field] = value == null ? '' : String(value)
  }
  return draft
}

function StageStepper({
  active,
  summary,
  onSelect,
}: {
  active: StageKey
  summary: ProjectStagesSummary | null
  onSelect: (key: StageKey) => void
}) {
  const { t } = useTranslation()
  const colors = useThemeColors()
  return (
    <View className="shrink-0">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-3 px-5 py-3"
        style={{ flexGrow: 0 }}
      >
        {STAGE_KEYS.map((key, index) => {
          const isActive = key === active
          const complete = summary?.[key]?.isComplete
          const started = summary?.[key]?.exists
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              className={`w-32 gap-1 rounded-2xl border p-3 ${
                isActive ? 'border-primary bg-primary/10' : 'border-border/60 bg-card'
              }`}
              onPress={() => onSelect(key)}
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-xs font-bold uppercase text-muted-foreground">
                  {index + 1}
                </Text>
                {complete ? <Check size={16} color={colors.success} /> : null}
              </View>
              <Text
                className={`text-sm font-bold ${isActive ? 'text-primary' : 'text-foreground'}`}
                numberOfLines={1}
              >
                {enumLabel(t, 'stage', key)}
              </Text>
              <Text
                className={`text-xs ${complete ? 'text-success' : 'text-muted-foreground'}`}
                numberOfLines={1}
              >
                {complete
                  ? t('stages.complete')
                  : started
                    ? t('stages.inProgress')
                    : t('stages.notStarted')}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}

function fieldsForStage(key: StageKey): { key: string; multiline?: boolean }[] {
  switch (key) {
    case 'geotechnical':
      return [
        { key: 'soilType' },
        { key: 'soilBearingCapacity' },
        { key: 'groundwaterLevel' },
        { key: 'foundationRecommendation', multiline: true },
        { key: 'consultantName' },
        { key: 'startDate' },
        { key: 'completionDate' },
        { key: 'notes', multiline: true },
      ]
    case 'design':
      return [
        { key: 'architectName' },
        { key: 'structuralEngineerName' },
        { key: 'mepEngineerName' },
        { key: 'startDate' },
        { key: 'completionDate' },
        { key: 'notes', multiline: true },
      ]
    case 'licensing':
      return [
        { key: 'permitNumber' },
        { key: 'issuingAuthority' },
        { key: 'applicationDate' },
        { key: 'approvalDate' },
        { key: 'expiryDate' },
        { key: 'notes', multiline: true },
      ]
    case 'materials':
      return [
        { key: 'supplierName' },
        { key: 'materialDescription', multiline: true },
        { key: 'quantity' },
        { key: 'unit' },
        { key: 'totalCost' },
        { key: 'currency' },
        { key: 'originCountry' },
        { key: 'orderDate' },
        { key: 'expectedArrivalDate' },
        { key: 'actualArrivalDate' },
        { key: 'notes', multiline: true },
      ]
    case 'maintenance':
      return [
        { key: 'maintenanceType' },
        { key: 'description', multiline: true },
        { key: 'responsiblePerson' },
        { key: 'scheduledDate' },
        { key: 'completionDate' },
        { key: 'cost' },
        { key: 'notes', multiline: true },
      ]
  }
}

/** Draft keys that hold an uploaded file's storage key, per stage. */
function fileFieldsForStage(key: StageKey): string[] {
  switch (key) {
    case 'geotechnical':
      return ['reportFilePath']
    case 'design':
      return ['architecturalDesignPath', 'structuralDesignPath', 'mepDesignPath']
    case 'licensing':
      return ['permitFilePath']
    case 'materials':
      return ['invoiceFilePath']
    case 'maintenance':
      return ['reportFilePath']
  }
}

type ProjectStagesScreenProps = {
  basePath?: string
}

export function ProjectStagesScreen({ basePath = '/pm/projects' }: ProjectStagesScreenProps) {
  const { id } = useLocalSearchParams<{ id: string }>()
  const projectId = typeof id === 'string' ? id : id?.[0]
  const { t } = useTranslation()
  const handleApiError = useHandleApiError()
  const toastSuccess = useToastSuccess()

  const [activeKey, setActiveKey] = useState<StageKey>('geotechnical')
  const [draft, setDraft] = useState<StageDraft>(emptyDraft())
  const [isSaving, setIsSaving] = useState(false)

  const loadProject = useCallback(() => {
    if (!projectId) return Promise.reject(new Error('Project id required'))
    return getProjectById(projectId)
  }, [projectId])
  const projectRemote = useRemoteData(loadProject, { enabled: Boolean(projectId) })

  const loadStages = useCallback(() => {
    if (!projectId) return Promise.reject(new Error('Project id required'))
    return getProjectStagesSummary(projectId)
  }, [projectId])
  const stagesRemote = useRemoteData(loadStages, { enabled: Boolean(projectId) })
  const summary = stagesRemote.status === 'success' ? stagesRemote.data.data : null

  useEffect(() => {
    if (!summary) return
    setDraft(draftFromSummary(summary, activeKey))
  }, [summary, activeKey])

  const fields = useMemo(() => fieldsForStage(activeKey), [activeKey])
  const fileFields = useMemo(() => fileFieldsForStage(activeKey), [activeKey])
  const activeIndex = STAGE_KEYS.indexOf(activeKey)
  const isLast = activeIndex >= STAGE_KEYS.length - 1

  const isLoading = projectRemote.isLoading || stagesRemote.isLoading
  const error =
    projectRemote.status === 'error'
      ? projectRemote.error
      : stagesRemote.status === 'error'
        ? stagesRemote.error
        : undefined

  async function persist(continueNext: boolean) {
    if (!projectId) return
    setIsSaving(true)
    try {
      await saveStageDraft(projectId, activeKey, draft)
      await stagesRemote.refetch()
      if (continueNext && !isLast) {
        setActiveKey(STAGE_KEYS[activeIndex + 1]!)
      } else {
        toastSuccess(t('stages.saved', { stage: enumLabel(t, 'stage', activeKey) }))
      }
    } catch (err) {
      handleApiError(err, t('stages.saveFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  const projectName = projectRemote.status === 'success' ? projectRemote.data.data.name : ''
  const stageStatusOptions = useMemo(
    () => enumOptions(t, 'stageStatus', PROJECT_STAGE_STATUS_OPTIONS),
    [t],
  )

  return (
    <FormScreen
      title={t('stages.title')}
      subtitle={projectName}
      backHref={`${basePath}/${projectId ?? ''}`}
      isLoading={isLoading}
      error={error}
      loadingLabel={t('stages.loading')}
      onRetry={() => {
        void projectRemote.refetch()
        void stagesRemote.refetch()
      }}
      footer={
        <>
          <Button
            className="flex-1"
            variant="outline"
            disabled={isSaving}
            onPress={() => void persist(false)}
          >
            {isSaving ? <ButtonSpinner /> : null}
            <ButtonText>{t('common.save')}</ButtonText>
          </Button>
          <Button
            className="flex-1"
            disabled={isSaving || isLast}
            onPress={() => void persist(true)}
          >
            <ButtonText>{isLast ? t('stages.done') : t('stages.saveNext')}</ButtonText>
          </Button>
        </>
      }
    >
      <StageStepper active={activeKey} summary={summary} onSelect={setActiveKey} />
      <Section title={enumLabel(t, 'stage', activeKey)}>
        <ChoiceField
          label={t('stages.status')}
          options={stageStatusOptions}
          value={draft.status ?? 'NOT_STARTED'}
          onChange={(value) => setDraft((current) => ({ ...current, status: value }))}
        />
        {fields.map((field) => (
          <TextField
            key={field.key}
            label={t(`stageFields.${field.key}`)}
            multiline={field.multiline}
            value={draft[field.key] ?? ''}
            onChangeText={(value) => setDraft((current) => ({ ...current, [field.key]: value }))}
            autoCapitalize={field.multiline ? 'sentences' : 'none'}
          />
        ))}
      </Section>
      {projectId ? (
        <Section title={t('stages.documents')} icon={Paperclip} tone="info">
          {fileFields.map((field) => (
            <StageFileField
              key={`${activeKey}-${field}`}
              projectId={projectId}
              label={t(`stageFileFields.${field}`)}
              value={draft[field] ?? ''}
              disabled={isSaving}
              onChange={(next) => setDraft((current) => ({ ...current, [field]: next }))}
            />
          ))}
        </Section>
      ) : null}
    </FormScreen>
  )
}
