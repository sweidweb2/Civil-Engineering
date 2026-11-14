import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { DatePicker } from '@/components/ui/date-picker'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { licensingChecklist, missingCount } from '@/features/projects/lib/stage-completeness'
import { parseStageDate, stageDateToIso } from '@/features/projects/lib/stage-dates'
import {
  STAGE_KEYS,
  type ProjectLicensing,
  type UpsertLicensingInput,
  upsertLicensing,
} from '@/services/project-stages'

import { StageBodyShell } from './StageBodyShell'
import { StageFieldLabel } from './StageFieldLabel'
import { StageFileCard } from './StageFileCard'
import { StageSection } from './StageSection'

function emptyDraft(): UpsertLicensingInput {
  return {
    permitNumber: '',
    issuingAuthority: '',
    applicationDate: '',
    approvalDate: '',
    permitFilePath: '',
    status: 'NOT_STARTED',
    expiryDate: '',
    notes: '',
  }
}

function fromRecord(data: ProjectLicensing | null): UpsertLicensingInput {
  if (!data) return emptyDraft()
  return {
    permitNumber: data.permitNumber ?? '',
    issuingAuthority: data.issuingAuthority ?? '',
    applicationDate: data.applicationDate ?? '',
    approvalDate: data.approvalDate ?? '',
    permitFilePath: data.permitFilePath ?? '',
    status: data.status,
    expiryDate: data.expiryDate ?? '',
    notes: data.notes ?? '',
  }
}

type LicensingFormProps = {
  projectId: string
  initial: ProjectLicensing | null
  stepIndex: number
  onSaved: () => void
  onContinue: () => void
}

export function LicensingForm({
  projectId,
  initial,
  stepIndex,
  onSaved,
  onContinue,
}: LicensingFormProps) {
  const { t } = useTranslation('projects')
  const [baseline, setBaseline] = useState(() => fromRecord(initial))
  const [form, setForm] = useState(baseline)
  const [isSaving, setIsSaving] = useState(false)
  const checklist = licensingChecklist(form)
  const missing = missingCount(checklist)
  const isDirty = JSON.stringify(form) !== JSON.stringify(baseline)

  const persist = async (continueNext: boolean) => {
    setIsSaving(true)
    try {
      await upsertLicensing(projectId, {
        ...form,
        permitNumber: form.permitNumber || null,
        issuingAuthority: form.issuingAuthority || null,
        applicationDate: form.applicationDate || null,
        approvalDate: form.approvalDate || null,
        permitFilePath: form.permitFilePath || null,
        expiryDate: form.expiryDate || null,
        notes: form.notes || null,
      } as UpsertLicensingInput)
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
      stageKey="licensing"
      stepIndex={stepIndex}
      totalSteps={STAGE_KEYS.length}
      status={form.status}
      onStatusChange={(status) => setForm({ ...form, status })}
      missingCount={missing}
      checklist={checklist}
      nextStageLabel={t('stages.names.materials')}
      isSaving={isSaving}
      isDirty={isDirty}
      onDiscard={() => setForm(baseline)}
      onSaveDraft={() => void persist(false)}
      onSaveContinue={() => void persist(true)}
      sidebarFiles={
        <StageFileCard
          projectId={projectId}
          title={t('stages.fields.permitFilePath')}
          hint={t('stages.placeholders.permitFilePath')}
          value={form.permitFilePath}
          onChange={(permitFilePath) => setForm({ ...form, permitFilePath })}
          disabled={isSaving}
        />
      }
    >
      <StageSection title={t('stages.sections.permitDetails')}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field>
            <StageFieldLabel htmlFor="permitNumber" required>
              {t('stages.fields.permitNumber')}
            </StageFieldLabel>
            <Input
              id="permitNumber"
              value={form.permitNumber}
              placeholder={t('stages.placeholders.permitNumber')}
              onChange={(e) => setForm({ ...form, permitNumber: e.target.value })}
            />
          </Field>
          <Field>
            <StageFieldLabel htmlFor="issuingAuthority" required>
              {t('stages.fields.issuingAuthority')}
            </StageFieldLabel>
            <Input
              id="issuingAuthority"
              value={form.issuingAuthority}
              placeholder={t('stages.placeholders.issuingAuthority')}
              onChange={(e) => setForm({ ...form, issuingAuthority: e.target.value })}
            />
          </Field>
        </div>
      </StageSection>

      <StageSection title={t('stages.sections.permitDates')}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field className="md:col-span-2">
            <StageFieldLabel required>{t('stages.fields.applicationDate')}</StageFieldLabel>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
              <DatePicker
                value={parseStageDate(form.applicationDate)}
                placeholder={t('stages.placeholders.applicationDate')}
                onChange={(date) => setForm({ ...form, applicationDate: stageDateToIso(date) })}
              />
              <span className="hidden text-center text-muted-foreground sm:block">
                {t('stages.dateRangeSeparator')}
              </span>
              <DatePicker
                value={parseStageDate(form.approvalDate)}
                placeholder={t('stages.placeholders.approvalDate')}
                onChange={(date) => setForm({ ...form, approvalDate: stageDateToIso(date) })}
              />
            </div>
          </Field>
          <Field>
            <StageFieldLabel optional>{t('stages.fields.expiryDate')}</StageFieldLabel>
            <DatePicker
              value={parseStageDate(form.expiryDate)}
              placeholder={t('stages.placeholders.expiryDate')}
              onChange={(date) => setForm({ ...form, expiryDate: stageDateToIso(date) })}
            />
          </Field>
          <Field className="md:col-span-2">
            <StageFieldLabel htmlFor="licensingNotes" optional>
              {t('stages.fields.notes')}
            </StageFieldLabel>
            <Input
              id="licensingNotes"
              value={form.notes}
              placeholder={t('stages.placeholders.notes')}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>
        </div>
      </StageSection>
    </StageBodyShell>
  )
}
