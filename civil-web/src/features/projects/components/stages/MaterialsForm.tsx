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
  type MaterialProcurement,
  type UpsertMaterialsInput,
  upsertMaterials,
} from '@/services/project-stages'

import { StageFileField } from './StageFileField'
import { StageStatusField } from './StageStatusField'

function emptyDraft(): UpsertMaterialsInput {
  return {
    supplierName: '',
    materialDescription: '',
    quantity: '',
    unit: '',
    totalCost: '',
    currency: 'USD',
    originCountry: '',
    orderDate: '',
    expectedArrivalDate: '',
    actualArrivalDate: null,
    invoiceFilePath: '',
    status: 'NOT_STARTED',
    notes: '',
  }
}

function fromRecord(data: MaterialProcurement | null): UpsertMaterialsInput {
  if (!data) return emptyDraft()
  return {
    supplierName: data.supplierName,
    materialDescription: data.materialDescription,
    quantity: data.quantity,
    unit: data.unit,
    totalCost: data.totalCost,
    currency: data.currency,
    originCountry: data.originCountry,
    orderDate: data.orderDate,
    expectedArrivalDate: data.expectedArrivalDate,
    actualArrivalDate: data.actualArrivalDate,
    invoiceFilePath: data.invoiceFilePath,
    status: data.status,
    notes: data.notes,
  }
}

type MaterialsFormProps = {
  projectId: string
  initial: MaterialProcurement | null
  onSaved: () => void
}

export function MaterialsForm({ projectId, initial, onSaved }: MaterialsFormProps) {
  const { t } = useTranslation('projects')
  const [form, setForm] = useState(() => fromRecord(initial))
  const [isSaving, setIsSaving] = useState(false)

  const save = async () => {
    setIsSaving(true)
    try {
      await upsertMaterials(projectId, form)
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
          <Label htmlFor="supplierName">{t('stages.fields.supplierName')}</Label>
          <Input
            id="supplierName"
            value={form.supplierName}
            maxLength={200}
            onChange={(e) => setForm({ ...form, supplierName: e.target.value })}
          />
        </Field>
        <Field>
          <Label htmlFor="originCountry">{t('stages.fields.originCountry')}</Label>
          <Input
            id="originCountry"
            value={form.originCountry}
            maxLength={100}
            onChange={(e) => setForm({ ...form, originCountry: e.target.value })}
          />
        </Field>
        <Field>
          <Label htmlFor="quantity">{t('stages.fields.quantity')}</Label>
          <Input
            id="quantity"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          />
        </Field>
        <Field>
          <Label htmlFor="unit">{t('stages.fields.unit')}</Label>
          <Input
            id="unit"
            value={form.unit}
            maxLength={40}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
          />
        </Field>
        <Field>
          <Label htmlFor="totalCost">{t('stages.fields.totalCost')}</Label>
          <Input
            id="totalCost"
            value={form.totalCost}
            onChange={(e) => setForm({ ...form, totalCost: e.target.value })}
          />
        </Field>
        <Field>
          <Label htmlFor="currency">{t('stages.fields.currency')}</Label>
          <Input
            id="currency"
            value={form.currency}
            maxLength={10}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
          />
        </Field>
        <StageStatusField value={form.status} onChange={(status) => setForm({ ...form, status })} />
        <Field>
          <Label>{t('stages.fields.orderDate')}</Label>
          <DatePicker
            value={parseStageDate(form.orderDate)}
            onChange={(date) => setForm({ ...form, orderDate: stageDateToIso(date) })}
          />
        </Field>
        <Field>
          <Label>{t('stages.fields.expectedArrivalDate')}</Label>
          <DatePicker
            value={parseStageDate(form.expectedArrivalDate)}
            onChange={(date) => setForm({ ...form, expectedArrivalDate: stageDateToIso(date) })}
          />
        </Field>
        <Field>
          <Label>{t('stages.fields.actualArrivalDate')}</Label>
          <DatePicker
            value={parseStageDate(form.actualArrivalDate)}
            onChange={(date) => setForm({ ...form, actualArrivalDate: stageDateToIsoOrNull(date) })}
          />
        </Field>
      </div>
      <Field>
        <Label htmlFor="materialDescription">{t('stages.fields.materialDescription')}</Label>
        <Textarea
          id="materialDescription"
          value={form.materialDescription}
          maxLength={5000}
          onChange={(e) => setForm({ ...form, materialDescription: e.target.value })}
        />
      </Field>
      <StageFileField
        projectId={projectId}
        label={t('stages.fields.invoiceFilePath')}
        value={form.invoiceFilePath}
        onChange={(invoiceFilePath) => setForm({ ...form, invoiceFilePath })}
        disabled={isSaving}
      />
      <Field>
        <Label htmlFor="materialsNotes">{t('stages.fields.notes')}</Label>
        <Textarea
          id="materialsNotes"
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
