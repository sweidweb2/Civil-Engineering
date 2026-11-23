import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { DatePicker } from '@/components/ui/date-picker'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { designChecklist, missingCount } from '@/features/projects/lib/stage-completeness'
import { parseStageDate, stageDateToIso } from '@/features/projects/lib/stage-dates'
import {
  type ProjectDesign,
  STAGE_KEYS,
  upsertDesign,
  type UpsertDesignInput,
} from '@/services/project-stages'

import { DesignStageRequestsSection } from '@/features/design-requests/DesignStageRequestsSection'

import { StageBodyShell } from './StageBodyShell'
import { StageFieldLabel } from './StageFieldLabel'
import { StageFileCard } from './StageFileCard'
import { StageSection } from './StageSection'

function emptyDraft(): UpsertDesignInput {
  return {
    architecturalDesignPath: '',
    structuralDesignPath: '',
    mepDesignPath: '',
    architectName: '',
    structuralEngineerName: '',
    mepEngineerName: '',
    status: 'NOT_STARTED',
    startDate: '',
    completionDate: '',
    notes: '',
  }
}

function fromRecord(data: ProjectDesign | null): UpsertDesignInput {
  if (!data) return emptyDraft()
  return {
    architecturalDesignPath: data.architecturalDesignPath ?? '',
    structuralDesignPath: data.structuralDesignPath ?? '',
    mepDesignPath: data.mepDesignPath ?? '',
    architectName: data.architectName ?? '',
    structuralEngineerName: data.structuralEngineerName ?? '',
    mepEngineerName: data.mepEngineerName ?? '',
    status: data.status,
    startDate: data.startDate ?? '',
    completionDate: data.completionDate ?? '',
    notes: data.notes ?? '',
  }
}

type DesignFormProps = {
  projectId: string
  initial: ProjectDesign | null
  stepIndex: number
  onSaved: () => void
  onContinue: () => void
}

export function DesignForm({
  projectId,
  initial,
  stepIndex,
  onSaved,
  onContinue,
}: DesignFormProps) {
  const { t } = useTranslation('projects')
  const [baseline, setBaseline] = useState(() => fromRecord(initial))
  const [form, setForm] = useState(baseline)
  const [isSaving, setIsSaving] = useState(false)
  const checklist = designChecklist(form)
  const missing = missingCount(checklist)
  const isDirty = JSON.stringify(form) !== JSON.stringify(baseline)

  const persist = async (continueNext: boolean) => {
    setIsSaving(true)
    try {
      await upsertDesign(projectId, {
        ...form,
        architecturalDesignPath: form.architecturalDesignPath || null,
        structuralDesignPath: form.structuralDesignPath || null,
        mepDesignPath: form.mepDesignPath || null,
        architectName: form.architectName || null,
        structuralEngineerName: form.structuralEngineerName || null,
        mepEngineerName: form.mepEngineerName || null,
        startDate: form.startDate || null,
        completionDate: form.completionDate || null,
        notes: form.notes || null,
      } as UpsertDesignInput)
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
      stageKey="design"
      stepIndex={stepIndex}
      totalSteps={STAGE_KEYS.length}
      status={form.status}
      onStatusChange={(status) => setForm({ ...form, status })}
      missingCount={missing}
      checklist={checklist}
      nextStageLabel={t('stages.names.licensing')}
      isSaving={isSaving}
      isDirty={isDirty}
      onDiscard={() => setForm(baseline)}
      onSaveDraft={() => void persist(false)}
      onSaveContinue={() => void persist(true)}
      sidebarFiles={
        <>
          <StageFileCard
            projectId={projectId}
            title={t('stages.fields.architecturalDesignPath')}
            hint={t('stages.placeholders.architecturalDesignPath')}
            value={form.architecturalDesignPath}
            onChange={(architecturalDesignPath) => setForm({ ...form, architecturalDesignPath })}
            disabled={isSaving}
          />
          <StageFileCard
            projectId={projectId}
            title={t('stages.fields.structuralDesignPath')}
            hint={t('stages.placeholders.structuralDesignPath')}
            value={form.structuralDesignPath}
            onChange={(structuralDesignPath) => setForm({ ...form, structuralDesignPath })}
            disabled={isSaving}
          />
          <StageFileCard
            projectId={projectId}
            title={t('stages.fields.mepDesignPath')}
            hint={t('stages.placeholders.mepDesignPath')}
            value={form.mepDesignPath}
            onChange={(mepDesignPath) => setForm({ ...form, mepDesignPath })}
            disabled={isSaving}
          />
        </>
      }
    >
      <DesignStageRequestsSection projectId={projectId} />

      <StageSection title={t('stages.sections.designTeam')}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field>
            <StageFieldLabel htmlFor="architectName" required>
              {t('stages.fields.architectName')}
            </StageFieldLabel>
            <Input
              id="architectName"
              value={form.architectName}
              onChange={(e) => setForm({ ...form, architectName: e.target.value })}
            />
          </Field>
          <Field>
            <StageFieldLabel htmlFor="structuralEngineerName" required>
              {t('stages.fields.structuralEngineerName')}
            </StageFieldLabel>
            <Input
              id="structuralEngineerName"
              value={form.structuralEngineerName}
              onChange={(e) => setForm({ ...form, structuralEngineerName: e.target.value })}
            />
          </Field>
          <Field>
            <StageFieldLabel htmlFor="mepEngineerName" required>
              {t('stages.fields.mepEngineerName')}
            </StageFieldLabel>
            <Input
              id="mepEngineerName"
              value={form.mepEngineerName}
              onChange={(e) => setForm({ ...form, mepEngineerName: e.target.value })}
            />
          </Field>
        </div>
      </StageSection>

      <StageSection title={t('stages.sections.designPeriod')}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field className="md:col-span-2">
            <StageFieldLabel required>{t('stages.designPeriod')}</StageFieldLabel>
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
          <Field className="md:col-span-2">
            <StageFieldLabel htmlFor="designNotes" optional>
              {t('stages.fields.notes')}
            </StageFieldLabel>
            <Input
              id="designNotes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>
        </div>
      </StageSection>
    </StageBodyShell>
  )
}
