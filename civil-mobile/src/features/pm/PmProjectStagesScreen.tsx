import { useCallback, useEffect, useMemo, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'

import { AsyncState } from '@/components/feedback/AsyncState'
import { FormField } from '@/components/forms/FormField'
import { OptionChips } from '@/components/forms/OptionChips'
import { Header } from '@/components/layout/Header'
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button'
import { Input, InputField } from '@/components/ui/input'
import { Pressable } from '@/components/ui/pressable'
import { Textarea, TextareaInput } from '@/components/ui/textarea'
import { BackButton } from '@/features/pm/components/BackButton'
import { useRemoteData } from '@/hooks/useRemoteData'
import { useThemeColors } from '@/hooks/useThemeColors'
import { ApiError } from '@/services/api'
import { showApiAlert, showBlockingAlert } from '@/services/feedback'
import {
  getProjectStagesSummary,
  PROJECT_STAGE_STATUS_OPTIONS,
  type ProjectStagesSummary,
  type ProjectStageStatus,
  STAGE_KEYS,
  STAGE_LABELS,
  type StageKey,
  upsertDesign,
  upsertGeotechnical,
  upsertLicensing,
  upsertMaintenance,
  upsertMaterials,
} from '@/services/project-stages'
import { getProjectById } from '@/services/projects'
import { useToastApiError } from '@/services/toast'

type StageDraft = Record<string, string>

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
  const colors = useThemeColors()
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="grow-0">
      <View className="flex-row gap-2 px-4 py-3">
        {STAGE_KEYS.map((key, index) => {
          const isActive = key === active
          const complete = summary?.[key]?.isComplete
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              className={`min-w-[116px] rounded-2xl border px-3 py-2.5 ${
                isActive ? 'border-primary bg-primary/10' : 'border-border/60 bg-card'
              }`}
              onPress={() => onSelect(key)}
            >
              <Text className="text-[10px] uppercase text-muted-foreground">Step {index + 1}</Text>
              <Text
                className={`text-sm font-medium ${isActive ? 'text-primary' : 'text-foreground'}`}
                numberOfLines={1}
              >
                {STAGE_LABELS[key]}
              </Text>
              <Text
                className="text-xs"
                style={{ color: complete ? colors.success : colors.textMuted }}
              >
                {complete ? 'Complete' : summary?.[key]?.exists ? 'In progress' : 'Not started'}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </ScrollView>
  )
}

function fieldsForStage(key: StageKey): { key: string; label: string; multiline?: boolean }[] {
  switch (key) {
    case 'geotechnical':
      return [
        { key: 'soilType', label: 'Soil type' },
        { key: 'soilBearingCapacity', label: 'Bearing capacity' },
        { key: 'groundwaterLevel', label: 'Groundwater level' },
        { key: 'foundationRecommendation', label: 'Foundation recommendation', multiline: true },
        { key: 'consultantName', label: 'Consultant' },
        { key: 'startDate', label: 'Start date (YYYY-MM-DD)' },
        { key: 'completionDate', label: 'Completion date (YYYY-MM-DD)' },
        { key: 'notes', label: 'Notes', multiline: true },
      ]
    case 'design':
      return [
        { key: 'architectName', label: 'Architect' },
        { key: 'structuralEngineerName', label: 'Structural engineer' },
        { key: 'mepEngineerName', label: 'MEP engineer' },
        { key: 'startDate', label: 'Start date (YYYY-MM-DD)' },
        { key: 'completionDate', label: 'Completion date (YYYY-MM-DD)' },
        { key: 'notes', label: 'Notes', multiline: true },
      ]
    case 'licensing':
      return [
        { key: 'permitNumber', label: 'Permit number' },
        { key: 'issuingAuthority', label: 'Issuing authority' },
        { key: 'applicationDate', label: 'Application date (YYYY-MM-DD)' },
        { key: 'approvalDate', label: 'Approval date (YYYY-MM-DD)' },
        { key: 'expiryDate', label: 'Expiry date (YYYY-MM-DD)' },
        { key: 'notes', label: 'Notes', multiline: true },
      ]
    case 'materials':
      return [
        { key: 'supplierName', label: 'Supplier' },
        { key: 'materialDescription', label: 'Material description', multiline: true },
        { key: 'quantity', label: 'Quantity' },
        { key: 'unit', label: 'Unit' },
        { key: 'totalCost', label: 'Total cost' },
        { key: 'currency', label: 'Currency' },
        { key: 'originCountry', label: 'Origin country' },
        { key: 'orderDate', label: 'Order date (YYYY-MM-DD)' },
        { key: 'expectedArrivalDate', label: 'Expected arrival (YYYY-MM-DD)' },
        { key: 'actualArrivalDate', label: 'Actual arrival (YYYY-MM-DD)' },
        { key: 'notes', label: 'Notes', multiline: true },
      ]
    case 'maintenance':
      return [
        { key: 'maintenanceType', label: 'Maintenance type' },
        { key: 'description', label: 'Description', multiline: true },
        { key: 'responsiblePerson', label: 'Responsible person' },
        { key: 'scheduledDate', label: 'Scheduled date (YYYY-MM-DD)' },
        { key: 'completionDate', label: 'Completion date (YYYY-MM-DD)' },
        { key: 'cost', label: 'Cost' },
        { key: 'notes', label: 'Notes', multiline: true },
      ]
  }
}

function toNullable(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? ''
  return trimmed.length > 0 ? trimmed : null
}

function toRequiredString(value: string | undefined): string {
  return value?.trim() ?? ''
}

type PmProjectStagesScreenProps = {
  basePath?: string
}

export function PmProjectStagesScreen({ basePath = '/pm/projects' }: PmProjectStagesScreenProps) {
  const { id } = useLocalSearchParams<{ id: string }>()
  const projectId = typeof id === 'string' ? id : id?.[0]
  const toastApiError = useToastApiError()

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
      const status = (draft.status as ProjectStageStatus) || 'NOT_STARTED'
      if (activeKey === 'geotechnical') {
        await upsertGeotechnical(projectId, {
          soilType: toRequiredString(draft.soilType),
          soilBearingCapacity: toRequiredString(draft.soilBearingCapacity),
          groundwaterLevel: toNullable(draft.groundwaterLevel),
          foundationRecommendation: toRequiredString(draft.foundationRecommendation),
          reportFilePath: toRequiredString(draft.reportFilePath),
          consultantName: toRequiredString(draft.consultantName),
          status,
          startDate: toRequiredString(draft.startDate),
          completionDate: toRequiredString(draft.completionDate),
          notes: toRequiredString(draft.notes),
        })
      } else if (activeKey === 'design') {
        await upsertDesign(projectId, {
          architecturalDesignPath: toRequiredString(draft.architecturalDesignPath),
          structuralDesignPath: toRequiredString(draft.structuralDesignPath),
          mepDesignPath: toRequiredString(draft.mepDesignPath),
          architectName: toRequiredString(draft.architectName),
          structuralEngineerName: toRequiredString(draft.structuralEngineerName),
          mepEngineerName: toRequiredString(draft.mepEngineerName),
          status,
          startDate: toRequiredString(draft.startDate),
          completionDate: toRequiredString(draft.completionDate),
          notes: toRequiredString(draft.notes),
        })
      } else if (activeKey === 'licensing') {
        await upsertLicensing(projectId, {
          permitNumber: toRequiredString(draft.permitNumber),
          issuingAuthority: toRequiredString(draft.issuingAuthority),
          applicationDate: toRequiredString(draft.applicationDate),
          approvalDate: toNullable(draft.approvalDate),
          permitFilePath: toRequiredString(draft.permitFilePath),
          status,
          expiryDate: toNullable(draft.expiryDate),
          notes: toRequiredString(draft.notes),
        })
      } else if (activeKey === 'materials') {
        await upsertMaterials(projectId, {
          supplierName: toRequiredString(draft.supplierName),
          materialDescription: toRequiredString(draft.materialDescription),
          quantity: toRequiredString(draft.quantity),
          unit: toRequiredString(draft.unit),
          totalCost: toRequiredString(draft.totalCost),
          currency: toRequiredString(draft.currency) || 'USD',
          originCountry: toRequiredString(draft.originCountry),
          orderDate: toRequiredString(draft.orderDate),
          expectedArrivalDate: toRequiredString(draft.expectedArrivalDate),
          actualArrivalDate: toNullable(draft.actualArrivalDate),
          invoiceFilePath: toRequiredString(draft.invoiceFilePath),
          status,
          notes: toRequiredString(draft.notes),
        })
      } else {
        await upsertMaintenance(projectId, {
          maintenanceType: toRequiredString(draft.maintenanceType),
          description: toRequiredString(draft.description),
          responsiblePerson: toRequiredString(draft.responsiblePerson),
          scheduledDate: toRequiredString(draft.scheduledDate),
          completionDate: toNullable(draft.completionDate),
          cost: toRequiredString(draft.cost),
          status,
          reportFilePath: toRequiredString(draft.reportFilePath),
          notes: toRequiredString(draft.notes),
        })
      }

      await stagesRemote.refetch()
      if (continueNext && !isLast) {
        setActiveKey(STAGE_KEYS[activeIndex + 1]!)
      } else {
        showBlockingAlert('Saved', `${STAGE_LABELS[activeKey]} stage was saved.`)
      }
    } catch (err) {
      if (err instanceof ApiError && err.status >= 500) toastApiError(err)
      else showApiAlert(err, 'Could not save stage')
    } finally {
      setIsSaving(false)
    }
  }

  const projectName = projectRemote.status === 'success' ? projectRemote.data.data.name : 'Stages'

  return (
    <View className="flex-1 bg-background">
      <Header
        title="Stages"
        subtitle={projectName}
        leftSlot={<BackButton fallbackHref={`${basePath}/${projectId ?? ''}`} />}
      />

      <AsyncState
        isLoading={isLoading}
        error={error}
        loadingLabel="Loading stages…"
        onRetry={() => {
          void projectRemote.refetch()
          void stagesRemote.refetch()
        }}
      >
        <StageStepper active={activeKey} summary={summary} onSelect={setActiveKey} />

        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-4 px-5 pb-10 pt-2"
          keyboardShouldPersistTaps="handled"
        >
          <Text className="text-lg font-semibold text-foreground">{STAGE_LABELS[activeKey]}</Text>

          <FormField label="Status">
            <OptionChips
              options={PROJECT_STAGE_STATUS_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              value={draft.status ?? 'NOT_STARTED'}
              onChange={(value) => setDraft((current) => ({ ...current, status: value }))}
            />
          </FormField>

          {fields.map((field) => (
            <FormField key={field.key} label={field.label}>
              {field.multiline ? (
                <Textarea>
                  <TextareaInput
                    value={draft[field.key] ?? ''}
                    onChangeText={(value) =>
                      setDraft((current) => ({ ...current, [field.key]: value }))
                    }
                  />
                </Textarea>
              ) : (
                <Input>
                  <InputField
                    value={draft[field.key] ?? ''}
                    onChangeText={(value) =>
                      setDraft((current) => ({ ...current, [field.key]: value }))
                    }
                  />
                </Input>
              )}
            </FormField>
          ))}

          <View className="flex-row gap-3">
            <Button
              className="flex-1"
              variant="outline"
              disabled={isSaving}
              onPress={() => void persist(false)}
            >
              {isSaving ? <ButtonSpinner /> : null}
              <ButtonText>Save</ButtonText>
            </Button>
            <Button
              className="flex-1"
              disabled={isSaving || isLast}
              onPress={() => void persist(true)}
            >
              <ButtonText>{isLast ? 'Done' : 'Save & next'}</ButtonText>
            </Button>
          </View>
        </ScrollView>
      </AsyncState>
    </View>
  )
}
