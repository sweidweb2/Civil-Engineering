import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { DatePicker } from '@/components/ui/date-picker'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { maintenanceChecklist, missingCount } from '@/features/projects/lib/stage-completeness'
import { parseStageDate, stageDateToIso } from '@/features/projects/lib/stage-dates'
import {
  type ProjectMaintenance,
  STAGE_KEYS,
  upsertMaintenance,
  type UpsertMaintenanceInput,
} from '@/services/project-stages'

import { StageBodyShell } from './StageBodyShell'
import { StageFieldLabel } from './StageFieldLabel'
import { StageFileCard } from './StageFileCard'
import { StageInputWithUnit } from './StageInputWithUnit'
import { StageSection } from './StageSection'

function emptyDraft(): UpsertMaintenanceInput {
  return {
    maintenanceType: '',
    description: '',
    responsiblePerson: '',
    scheduledDate: '',
    completionDate: '',
    cost: '',
    status: 'NOT_STARTED',
    reportFilePath: '',
    notes: '',
    expectedUpdatedAt: null,
  }
}

function fromRecord(data: ProjectMaintenance | null): UpsertMaintenanceInput {
  if (!data) return emptyDraft()
  return {
    maintenanceType: data.maintenanceType ?? '',
    description: data.description ?? '',
    responsiblePerson: data.responsiblePerson ?? '',
    scheduledDate: data.scheduledDate ?? '',
    completionDate: data.completionDate ?? '',
    cost: data.cost ?? '',
    status: data.status,
    reportFilePath: data.reportFilePath ?? '',
    notes: data.notes ?? '',
    expectedUpdatedAt: data.updatedAt,
  }
}

type MaintenanceFormProps = {
  projectId: string
  initial: ProjectMaintenance | null
  stepIndex: number
  onSaved: () => void
  onContinue: () => void
}

export function MaintenanceForm({
  projectId,
  initial,
  stepIndex,
  onSaved,
  onContinue,
}: MaintenanceFormProps) {
  const { t } = useTranslation('projects')
  const [baseline, setBaseline] = useState(() => fromRecord(initial))
  const [form, setForm] = useState(baseline)
  const [isSaving, setIsSaving] = useState(false)
  const checklist = maintenanceChecklist(form)
  const missing = missingCount(checklist)
  const isDirty = JSON.stringify(form) !== JSON.stringify(baseline)

  const persist = async (continueNext: boolean) => {
    setIsSaving(true)
    try {
      const saved = await upsertMaintenance(projectId, {
        ...form,
        maintenanceType: form.maintenanceType || null,
        description: form.description || null,
        responsiblePerson: form.responsiblePerson || null,
        scheduledDate: form.scheduledDate || null,
        completionDate: form.completionDate || null,
        cost: form.cost || null,
        reportFilePath: form.reportFilePath || null,
        notes: form.notes || null,
      } as UpsertMaintenanceInput)
      const next = { ...form, expectedUpdatedAt: saved.data.updatedAt }
      setForm(next)
      setBaseline(next)
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
      stageKey="maintenance"
      stepIndex={stepIndex}
      totalSteps={STAGE_KEYS.length}
      status={form.status}
      onStatusChange={(status) => setForm({ ...form, status })}
      missingCount={missing}
      checklist={checklist}
      nextStageLabel=""
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
      <StageSection title={t('stages.sections.maintenancePlan')}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field>
            <StageFieldLabel htmlFor="maintenanceType" required>
              {t('stages.fields.maintenanceType')}
            </StageFieldLabel>
            <Input
              id="maintenanceType"
              value={form.maintenanceType}
              onChange={(e) => setForm({ ...form, maintenanceType: e.target.value })}
            />
          </Field>
          <Field>
            <StageFieldLabel htmlFor="responsiblePerson" required>
              {t('stages.fields.responsiblePerson')}
            </StageFieldLabel>
            <Input
              id="responsiblePerson"
              value={form.responsiblePerson}
              onChange={(e) => setForm({ ...form, responsiblePerson: e.target.value })}
            />
          </Field>
          <Field>
            <StageFieldLabel htmlFor="cost" required>
              {t('stages.fields.cost')}
            </StageFieldLabel>
            <StageInputWithUnit
              id="cost"
              unit="USD"
              value={form.cost}
              onChange={(e) => setForm({ ...form, cost: e.target.value })}
            />
          </Field>
          <Field className="md:col-span-2">
            <StageFieldLabel required>{t('stages.fields.scheduledDate')}</StageFieldLabel>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
              <DatePicker
                value={parseStageDate(form.scheduledDate)}
                placeholder={t('stages.placeholders.scheduledDate')}
                onChange={(date) => setForm({ ...form, scheduledDate: stageDateToIso(date) })}
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

      <StageSection title={t('stages.sections.maintenanceDetails')}>
        <Field>
          <StageFieldLabel htmlFor="maintenanceDescription" required>
            {t('stages.fields.description')}
          </StageFieldLabel>
          <Textarea
            id="maintenanceDescription"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>
        <Field>
          <StageFieldLabel htmlFor="maintenanceNotes" optional>
            {t('stages.fields.notes')}
          </StageFieldLabel>
          <Input
            id="maintenanceNotes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </Field>
      </StageSection>
    </StageBodyShell>
  )
}
