import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { DatePicker } from '@/components/ui/date-picker'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { geotechnicalChecklist, missingCount } from '@/features/projects/lib/stage-completeness'
import { parseStageDate, stageDateToIso } from '@/features/projects/lib/stage-dates'
import {
  STAGE_KEYS,
  type GeotechnicalStudy,
  type UpsertGeotechnicalInput,
  upsertGeotechnical,
} from '@/services/project-stages'

import { StageBodyShell } from './StageBodyShell'
import { StageFieldLabel } from './StageFieldLabel'
import { StageFileCard } from './StageFileCard'
import { StageInputWithUnit } from './StageInputWithUnit'
import { StageSection } from './StageSection'

function emptyDraft(): UpsertGeotechnicalInput {
  return {
    soilType: '',
    soilBearingCapacity: '',
    groundwaterLevel: null,
    foundationRecommendation: '',
    reportFilePath: '',
    consultantName: '',
    status: 'NOT_STARTED',
    startDate: '',
    completionDate: '',
    notes: '',
  }
}

function fromRecord(data: GeotechnicalStudy | null): UpsertGeotechnicalInput {
  if (!data) return emptyDraft()
  return {
    soilType: data.soilType ?? '',
    soilBearingCapacity: data.soilBearingCapacity ?? '',
    groundwaterLevel: data.groundwaterLevel,
    foundationRecommendation: data.foundationRecommendation ?? '',
    reportFilePath: data.reportFilePath ?? '',
    consultantName: data.consultantName ?? '',
    status: data.status,
    startDate: data.startDate ?? '',
    completionDate: data.completionDate ?? '',
    notes: data.notes ?? '',
  }
}

type GeotechnicalFormProps = {
  projectId: string
  initial: GeotechnicalStudy | null
  stepIndex: number
  onSaved: () => void
  onContinue: () => void
}

export function GeotechnicalForm({
  projectId,
  initial,
  stepIndex,
  onSaved,
  onContinue,
}: GeotechnicalFormProps) {
  const { t } = useTranslation('projects')
  const [baseline, setBaseline] = useState(() => fromRecord(initial))
  const [form, setForm] = useState(baseline)
  const [isSaving, setIsSaving] = useState(false)
  const checklist = geotechnicalChecklist(form)
  const missing = missingCount(checklist)
  const isDirty = JSON.stringify(form) !== JSON.stringify(baseline)

  const persist = async (continueNext: boolean) => {
    setIsSaving(true)
    try {
      await upsertGeotechnical(projectId, {
        ...form,
        groundwaterLevel: form.groundwaterLevel?.trim() ? form.groundwaterLevel : null,
        soilType: form.soilType || null,
        soilBearingCapacity: form.soilBearingCapacity || null,
        foundationRecommendation: form.foundationRecommendation || null,
        reportFilePath: form.reportFilePath || null,
        consultantName: form.consultantName || null,
        startDate: form.startDate || null,
        completionDate: form.completionDate || null,
        notes: form.notes || null,
      } as UpsertGeotechnicalInput)
      setBaseline(form)
      toast.success(t('stages.saved'))
      if (continueNext) onContinue()
      else onSaved()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('stages.couldNotSave'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <StageBodyShell
      stageKey="geotechnical"
      stepIndex={stepIndex}
      totalSteps={STAGE_KEYS.length}
      status={form.status}
      onStatusChange={(status) => setForm({ ...form, status })}
      missingCount={missing}
      checklist={checklist}
      nextStageLabel={t('stages.names.design')}
      isSaving={isSaving}
      isDirty={isDirty}
      onDiscard={() => setForm(baseline)}
      onSaveDraft={() => void persist(false)}
      onSaveContinue={() => void persist(true)}
      sidebarFiles={
        <StageFileCard
          projectId={projectId}
          title={t('stages.fields.reportFilePath')}
          hint={t('stages.placeholders.reportFilePath')}
          value={form.reportFilePath}
          onChange={(reportFilePath) => setForm({ ...form, reportFilePath })}
          disabled={isSaving}
        />
      }
    >
      <StageSection title={t('stages.sections.soilAnalysis')}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field>
            <StageFieldLabel htmlFor="soilType" required>
              {t('stages.fields.soilType')}
            </StageFieldLabel>
            <Input
              id="soilType"
              value={form.soilType}
              placeholder={t('stages.placeholders.soilType')}
              onChange={(e) => setForm({ ...form, soilType: e.target.value })}
            />
          </Field>
          <Field>
            <StageFieldLabel htmlFor="soilBearingCapacity" required>
              {t('stages.fields.soilBearingCapacity')}
            </StageFieldLabel>
            <StageInputWithUnit
              id="soilBearingCapacity"
              unit="kPa"
              value={form.soilBearingCapacity}
              placeholder={t('stages.placeholders.soilBearingCapacity')}
              onChange={(e) => setForm({ ...form, soilBearingCapacity: e.target.value })}
            />
          </Field>
          <Field>
            <StageFieldLabel htmlFor="groundwaterLevel" optional>
              {t('stages.fields.groundwaterLevel')}
            </StageFieldLabel>
            <StageInputWithUnit
              id="groundwaterLevel"
              unit="m"
              value={form.groundwaterLevel ?? ''}
              placeholder={t('stages.placeholders.groundwaterLevel')}
              onChange={(e) => setForm({ ...form, groundwaterLevel: e.target.value || null })}
            />
          </Field>
        </div>
      </StageSection>

      <StageSection title={t('stages.sections.consultantSchedule')}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field>
            <StageFieldLabel htmlFor="consultantName" required>
              {t('stages.fields.consultantName')}
            </StageFieldLabel>
            <Input
              id="consultantName"
              value={form.consultantName}
              placeholder={t('stages.placeholders.consultantName')}
              onChange={(e) => setForm({ ...form, consultantName: e.target.value })}
            />
          </Field>
          <Field className="md:col-span-2">
            <StageFieldLabel required>{t('stages.studyPeriod')}</StageFieldLabel>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
              <DatePicker
                value={parseStageDate(form.startDate)}
                placeholder={t('stages.placeholders.startDate')}
                onChange={(date) => setForm({ ...form, startDate: stageDateToIso(date) })}
              />
              <span className="hidden text-center text-muted-foreground sm:block">
                {t('stages.dateRangeSeparator')}
              </span>
              <DatePicker
                value={parseStageDate(form.completionDate)}
                placeholder={t('stages.placeholders.completionDate')}
                onChange={(date) => setForm({ ...form, completionDate: stageDateToIso(date) })}
              />
            </div>
          </Field>
        </div>
      </StageSection>

      <StageSection title={t('stages.sections.findings')}>
        <Field>
          <StageFieldLabel htmlFor="foundationRecommendation" required>
            {t('stages.fields.foundationRecommendation')}
          </StageFieldLabel>
          <Textarea
            id="foundationRecommendation"
            value={form.foundationRecommendation}
            placeholder={t('stages.placeholders.foundationRecommendation')}
            onChange={(e) => setForm({ ...form, foundationRecommendation: e.target.value })}
          />
        </Field>
        <Field>
          <StageFieldLabel htmlFor="geoNotes" optional>
            {t('stages.fields.notes')}
          </StageFieldLabel>
          <Input
            id="geoNotes"
            value={form.notes}
            placeholder={t('stages.placeholders.notes')}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </Field>
      </StageSection>
    </StageBodyShell>
  )
}
