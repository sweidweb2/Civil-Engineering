import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  parseStageDate,
  stageDateToIso,
  stageDateToIsoOrNull,
} from '@/features/projects/lib/stage-dates'
import {
  type ProjectLicensing,
  type UpsertLicensingInput,
  upsertLicensing,
} from '@/services/project-stages'

import { StageFileField } from './StageFileField'
import { StageStatusField } from './StageStatusField'

function emptyDraft(): UpsertLicensingInput {
  return {
    permitNumber: '',
    issuingAuthority: '',
    applicationDate: '',
    approvalDate: null,
    permitFilePath: '',
    status: 'NOT_STARTED',
    expiryDate: null,
    notes: '',
  }
}

function fromRecord(data: ProjectLicensing | null): UpsertLicensingInput {
  if (!data) return emptyDraft()
  return {
    permitNumber: data.permitNumber,
    issuingAuthority: data.issuingAuthority,
    applicationDate: data.applicationDate,
    approvalDate: data.approvalDate,
    permitFilePath: data.permitFilePath,
    status: data.status,
    expiryDate: data.expiryDate,
    notes: data.notes,
  }
}

type LicensingFormProps = {
  projectId: string
  initial: ProjectLicensing | null
  onSaved: () => void
}

export function LicensingForm({ projectId, initial, onSaved }: LicensingFormProps) {
  const { t } = useTranslation('projects')
  const [form, setForm] = useState(() => fromRecord(initial))
  const [isSaving, setIsSaving] = useState(false)

  const save = async () => {
    setIsSaving(true)
    try {
      await upsertLicensing(projectId, form)
      toast.success(t('stages.saved'))
      onSaved()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('stages.couldNotSave'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field>
          <Label htmlFor="permitNumber">{t('stages.fields.permitNumber')}</Label>
          <Input
            id="permitNumber"
            value={form.permitNumber}
            maxLength={120}
            onChange={(e) => setForm({ ...form, permitNumber: e.target.value })}
          />
        </Field>
        <Field>
          <Label htmlFor="issuingAuthority">{t('stages.fields.issuingAuthority')}</Label>
          <Input
            id="issuingAuthority"
            value={form.issuingAuthority}
            maxLength={200}
            onChange={(e) => setForm({ ...form, issuingAuthority: e.target.value })}
          />
        </Field>
        <StageStatusField value={form.status} onChange={(status) => setForm({ ...form, status })} />
        <Field>
          <Label>{t('stages.fields.applicationDate')}</Label>
          <DatePicker
            value={parseStageDate(form.applicationDate)}
            onChange={(date) => setForm({ ...form, applicationDate: stageDateToIso(date) })}
          />
        </Field>
        <Field>
          <Label>{t('stages.fields.approvalDate')}</Label>
          <DatePicker
            value={parseStageDate(form.approvalDate)}
            onChange={(date) => setForm({ ...form, approvalDate: stageDateToIsoOrNull(date) })}
          />
        </Field>
        <Field>
          <Label>{t('stages.fields.expiryDate')}</Label>
          <DatePicker
            value={parseStageDate(form.expiryDate)}
            onChange={(date) => setForm({ ...form, expiryDate: stageDateToIsoOrNull(date) })}
          />
        </Field>
      </div>
      <StageFileField
        projectId={projectId}
        label={t('stages.fields.permitFilePath')}
        value={form.permitFilePath}
        onChange={(permitFilePath) => setForm({ ...form, permitFilePath })}
        disabled={isSaving}
      />
      <Field>
        <Label htmlFor="licensingNotes">{t('stages.fields.notes')}</Label>
        <Textarea
          id="licensingNotes"
          value={form.notes}
          maxLength={5000}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </Field>
      <div className="flex justify-end">
        <Button type="button" onClick={() => void save()} disabled={isSaving}>
          {isSaving ? t('stages.saving') : t('stages.saveStep')}
        </Button>
      </div>
    </div>
  )
}
