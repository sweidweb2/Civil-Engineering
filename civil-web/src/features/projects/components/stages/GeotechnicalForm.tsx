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
import {
  type GeotechnicalStudy,
  type UpsertGeotechnicalInput,
  upsertGeotechnical,
} from '@/services/project-stages'

import { StageFileField } from './StageFileField'
import { StageStatusField } from './StageStatusField'

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
    soilType: data.soilType,
    soilBearingCapacity: data.soilBearingCapacity,
    groundwaterLevel: data.groundwaterLevel,
    foundationRecommendation: data.foundationRecommendation,
    reportFilePath: data.reportFilePath,
    consultantName: data.consultantName,
    status: data.status,
    startDate: data.startDate,
    completionDate: data.completionDate,
    notes: data.notes,
  }
}

type GeotechnicalFormProps = {
  projectId: string
  initial: GeotechnicalStudy | null
  onSaved: () => void
}

export function GeotechnicalForm({ projectId, initial, onSaved }: GeotechnicalFormProps) {
  const { t } = useTranslation('projects')
  const [form, setForm] = useState(() => fromRecord(initial))
  const [isSaving, setIsSaving] = useState(false)

  const save = async () => {
    setIsSaving(true)
    try {
      await upsertGeotechnical(projectId, {
        ...form,
        groundwaterLevel: form.groundwaterLevel?.trim() ? form.groundwaterLevel : null,
      })
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
          <Label htmlFor="soilType">{t('stages.fields.soilType')}</Label>
          <Input
            id="soilType"
            value={form.soilType}
            maxLength={120}
            onChange={(e) => setForm({ ...form, soilType: e.target.value })}
          />
        </Field>
        <Field>
          <Label htmlFor="soilBearingCapacity">{t('stages.fields.soilBearingCapacity')}</Label>
          <Input
            id="soilBearingCapacity"
            value={form.soilBearingCapacity}
            onChange={(e) => setForm({ ...form, soilBearingCapacity: e.target.value })}
          />
        </Field>
        <Field>
          <Label htmlFor="groundwaterLevel">{t('stages.fields.groundwaterLevel')}</Label>
          <Input
            id="groundwaterLevel"
            value={form.groundwaterLevel ?? ''}
            onChange={(e) => setForm({ ...form, groundwaterLevel: e.target.value || null })}
          />
        </Field>
        <Field>
          <Label htmlFor="consultantName">{t('stages.fields.consultantName')}</Label>
          <Input
            id="consultantName"
            value={form.consultantName}
            maxLength={120}
            onChange={(e) => setForm({ ...form, consultantName: e.target.value })}
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
      <Field>
        <Label htmlFor="foundationRecommendation">
          {t('stages.fields.foundationRecommendation')}
        </Label>
        <Textarea
          id="foundationRecommendation"
          value={form.foundationRecommendation}
          maxLength={5000}
          onChange={(e) => setForm({ ...form, foundationRecommendation: e.target.value })}
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
        <Label htmlFor="geoNotes">{t('stages.fields.notes')}</Label>
        <Textarea
          id="geoNotes"
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
