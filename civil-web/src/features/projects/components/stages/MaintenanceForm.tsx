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
  type ProjectMaintenance,
  type UpsertMaintenanceInput,
  upsertMaintenance,
} from '@/services/project-stages'

import { StageFileField } from './StageFileField'
import { StageStatusField } from './StageStatusField'

function emptyDraft(): UpsertMaintenanceInput {
  return {
    maintenanceType: '',
    description: '',
    responsiblePerson: '',
    scheduledDate: '',
    completionDate: null,
    cost: '',
    status: 'NOT_STARTED',
    reportFilePath: '',
    notes: '',
  }
}

function fromRecord(data: ProjectMaintenance | null): UpsertMaintenanceInput {
  if (!data) return emptyDraft()
  return {
    maintenanceType: data.maintenanceType,
    description: data.description,
    responsiblePerson: data.responsiblePerson,
    scheduledDate: data.scheduledDate,
    completionDate: data.completionDate,
    cost: data.cost,
    status: data.status,
    reportFilePath: data.reportFilePath,
    notes: data.notes,
  }
}

type MaintenanceFormProps = {
  projectId: string
  initial: ProjectMaintenance | null
  onSaved: () => void
}

export function MaintenanceForm({ projectId, initial, onSaved }: MaintenanceFormProps) {
  const { t } = useTranslation('projects')
  const [form, setForm] = useState(() => fromRecord(initial))
  const [isSaving, setIsSaving] = useState(false)

  const save = async () => {
    setIsSaving(true)
    try {
      await upsertMaintenance(projectId, form)
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
          <Label htmlFor="maintenanceType">{t('stages.fields.maintenanceType')}</Label>
          <Input
            id="maintenanceType"
            value={form.maintenanceType}
            maxLength={120}
            onChange={(e) => setForm({ ...form, maintenanceType: e.target.value })}
          />
        </Field>
        <Field>
          <Label htmlFor="responsiblePerson">{t('stages.fields.responsiblePerson')}</Label>
          <Input
            id="responsiblePerson"
            value={form.responsiblePerson}
            maxLength={120}
            onChange={(e) => setForm({ ...form, responsiblePerson: e.target.value })}
          />
        </Field>
        <Field>
          <Label htmlFor="cost">{t('stages.fields.cost')}</Label>
          <Input
            id="cost"
            value={form.cost}
            onChange={(e) => setForm({ ...form, cost: e.target.value })}
          />
        </Field>
        <StageStatusField value={form.status} onChange={(status) => setForm({ ...form, status })} />
        <Field>
          <Label>{t('stages.fields.scheduledDate')}</Label>
          <DatePicker
            value={parseStageDate(form.scheduledDate)}
            onChange={(date) => setForm({ ...form, scheduledDate: stageDateToIso(date) })}
          />
        </Field>
        <Field>
          <Label>{t('stages.fields.completionDate')}</Label>
          <DatePicker
            value={parseStageDate(form.completionDate)}
            onChange={(date) => setForm({ ...form, completionDate: stageDateToIsoOrNull(date) })}
          />
        </Field>
      </div>
      <Field>
        <Label htmlFor="maintenanceDescription">{t('stages.fields.description')}</Label>
        <Textarea
          id="maintenanceDescription"
          value={form.description}
          maxLength={5000}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </Field>
      <StageFileField
        projectId={projectId}
        label={t('stages.fields.reportFilePath')}
        value={form.reportFilePath}
        onChange={(reportFilePath) => setForm({ ...form, reportFilePath })}
        disabled={isSaving}
      />
      <Field>
        <Label htmlFor="maintenanceNotes">{t('stages.fields.notes')}</Label>
        <Textarea
          id="maintenanceNotes"
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
