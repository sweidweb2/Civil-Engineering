import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { parseStageDate, stageDateToIso } from '@/features/projects/lib/stage-dates'
import { type ProjectDesign, type UpsertDesignInput, upsertDesign } from '@/services/project-stages'

import { StageFileField } from './StageFileField'
import { StageStatusField } from './StageStatusField'

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
    architecturalDesignPath: data.architecturalDesignPath,
    structuralDesignPath: data.structuralDesignPath,
    mepDesignPath: data.mepDesignPath,
    architectName: data.architectName,
    structuralEngineerName: data.structuralEngineerName,
    mepEngineerName: data.mepEngineerName,
    status: data.status,
    startDate: data.startDate,
    completionDate: data.completionDate,
    notes: data.notes,
  }
}

type DesignFormProps = {
  projectId: string
  initial: ProjectDesign | null
  onSaved: () => void
}

export function DesignForm({ projectId, initial, onSaved }: DesignFormProps) {
  const { t } = useTranslation('projects')
  const [form, setForm] = useState(() => fromRecord(initial))
  const [isSaving, setIsSaving] = useState(false)

  const save = async () => {
    setIsSaving(true)
    try {
      await upsertDesign(projectId, form)
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
          <Label htmlFor="architectName">{t('stages.fields.architectName')}</Label>
          <Input
            id="architectName"
            value={form.architectName}
            maxLength={120}
            onChange={(e) => setForm({ ...form, architectName: e.target.value })}
          />
        </Field>
        <Field>
          <Label htmlFor="structuralEngineerName">
            {t('stages.fields.structuralEngineerName')}
          </Label>
          <Input
            id="structuralEngineerName"
            value={form.structuralEngineerName}
            maxLength={120}
            onChange={(e) => setForm({ ...form, structuralEngineerName: e.target.value })}
          />
        </Field>
        <Field>
          <Label htmlFor="mepEngineerName">{t('stages.fields.mepEngineerName')}</Label>
          <Input
            id="mepEngineerName"
            value={form.mepEngineerName}
            maxLength={120}
            onChange={(e) => setForm({ ...form, mepEngineerName: e.target.value })}
          />
        </Field>
        <StageStatusField value={form.status} onChange={(status) => setForm({ ...form, status })} />
        <Field>
          <Label>{t('stages.fields.startDate')}</Label>
          <DatePicker
            value={parseStageDate(form.startDate)}
            onChange={(date) => setForm({ ...form, startDate: stageDateToIso(date) })}
          />
        </Field>
        <Field>
          <Label>{t('stages.fields.completionDate')}</Label>
          <DatePicker
            value={parseStageDate(form.completionDate)}
            onChange={(date) => setForm({ ...form, completionDate: stageDateToIso(date) })}
          />
        </Field>
      </div>
      <StageFileField
        projectId={projectId}
        label={t('stages.fields.architecturalDesignPath')}
        value={form.architecturalDesignPath}
        onChange={(architecturalDesignPath) => setForm({ ...form, architecturalDesignPath })}
        disabled={isSaving}
      />
      <StageFileField
        projectId={projectId}
        label={t('stages.fields.structuralDesignPath')}
        value={form.structuralDesignPath}
        onChange={(structuralDesignPath) => setForm({ ...form, structuralDesignPath })}
        disabled={isSaving}
      />
      <StageFileField
        projectId={projectId}
        label={t('stages.fields.mepDesignPath')}
        value={form.mepDesignPath}
        onChange={(mepDesignPath) => setForm({ ...form, mepDesignPath })}
        disabled={isSaving}
      />
      <Field>
        <Label htmlFor="designNotes">{t('stages.fields.notes')}</Label>
        <Textarea
          id="designNotes"
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
