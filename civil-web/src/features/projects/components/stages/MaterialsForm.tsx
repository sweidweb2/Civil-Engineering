import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { DatePicker } from '@/components/ui/date-picker'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { materialsChecklist, missingCount } from '@/features/projects/lib/stage-completeness'
import { parseStageDate, stageDateToIso } from '@/features/projects/lib/stage-dates'
import {
  type MaterialProcurement,
  STAGE_KEYS,
  upsertMaterials,
  type UpsertMaterialsInput,
} from '@/services/project-stages'

import { StageBodyShell } from './StageBodyShell'
import { StageFieldLabel } from './StageFieldLabel'
import { StageFileCard } from './StageFileCard'
import { StageInputWithUnit } from './StageInputWithUnit'
import { StageSection } from './StageSection'

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
    actualArrivalDate: '',
    invoiceFilePath: '',
    status: 'NOT_STARTED',
    notes: '',
  }
}

function fromRecord(data: MaterialProcurement | null): UpsertMaterialsInput {
  if (!data) return emptyDraft()
  return {
    supplierName: data.supplierName ?? '',
    materialDescription: data.materialDescription ?? '',
    quantity: data.quantity ?? '',
    unit: data.unit ?? '',
    totalCost: data.totalCost ?? '',
    currency: data.currency ?? 'USD',
    originCountry: data.originCountry ?? '',
    orderDate: data.orderDate ?? '',
    expectedArrivalDate: data.expectedArrivalDate ?? '',
    actualArrivalDate: data.actualArrivalDate ?? '',
    invoiceFilePath: data.invoiceFilePath ?? '',
    status: data.status,
    notes: data.notes ?? '',
  }
}

type MaterialsFormProps = {
  projectId: string
  initial: MaterialProcurement | null
  stepIndex: number
  onSaved: () => void
  onContinue: () => void
}

export function MaterialsForm({
  projectId,
  initial,
  stepIndex,
  onSaved,
  onContinue,
}: MaterialsFormProps) {
  const { t } = useTranslation('projects')
  const [baseline, setBaseline] = useState(() => fromRecord(initial))
  const [form, setForm] = useState(baseline)
  const [isSaving, setIsSaving] = useState(false)
  const checklist = materialsChecklist(form)
  const missing = missingCount(checklist)
  const isDirty = JSON.stringify(form) !== JSON.stringify(baseline)

  const persist = async (continueNext: boolean) => {
    setIsSaving(true)
    try {
      await upsertMaterials(projectId, {
        ...form,
        supplierName: form.supplierName || null,
        materialDescription: form.materialDescription || null,
        quantity: form.quantity || null,
        unit: form.unit || null,
        totalCost: form.totalCost || null,
        currency: form.currency || null,
        originCountry: form.originCountry || null,
        orderDate: form.orderDate || null,
        expectedArrivalDate: form.expectedArrivalDate || null,
        actualArrivalDate: form.actualArrivalDate || null,
        invoiceFilePath: form.invoiceFilePath || null,
        notes: form.notes || null,
      } as UpsertMaterialsInput)
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
      stageKey="materials"
      stepIndex={stepIndex}
      totalSteps={STAGE_KEYS.length}
      status={form.status}
      onStatusChange={(status) => setForm({ ...form, status })}
      missingCount={missing}
      checklist={checklist}
      nextStageLabel={t('stages.names.maintenance')}
      isSaving={isSaving}
      isDirty={isDirty}
      onDiscard={() => setForm(baseline)}
      onSaveDraft={() => void persist(false)}
      onSaveContinue={() => void persist(true)}
      sidebarFiles={
        <StageFileCard
          projectId={projectId}
          title={t('stages.fields.invoiceFilePath')}
          hint={t('stages.placeholders.invoiceFilePath')}
          value={form.invoiceFilePath}
          onChange={(invoiceFilePath) => setForm({ ...form, invoiceFilePath })}
          disabled={isSaving}
        />
      }
    >
      <StageSection title={t('stages.sections.supplierOrder')}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field>
            <StageFieldLabel htmlFor="supplierName" required>
              {t('stages.fields.supplierName')}
            </StageFieldLabel>
            <Input
              id="supplierName"
              value={form.supplierName}
              onChange={(e) => setForm({ ...form, supplierName: e.target.value })}
            />
          </Field>
          <Field>
            <StageFieldLabel htmlFor="originCountry" required>
              {t('stages.fields.originCountry')}
            </StageFieldLabel>
            <Input
              id="originCountry"
              value={form.originCountry}
              onChange={(e) => setForm({ ...form, originCountry: e.target.value })}
            />
          </Field>
          <Field>
            <StageFieldLabel htmlFor="quantity" required>
              {t('stages.fields.quantity')}
            </StageFieldLabel>
            <Input
              id="quantity"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
          </Field>
          <Field>
            <StageFieldLabel htmlFor="unit" required>
              {t('stages.fields.unit')}
            </StageFieldLabel>
            <Input
              id="unit"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            />
          </Field>
          <Field>
            <StageFieldLabel htmlFor="totalCost" required>
              {t('stages.fields.totalCost')}
            </StageFieldLabel>
            <StageInputWithUnit
              id="totalCost"
              unit={form.currency || 'USD'}
              value={form.totalCost}
              onChange={(e) => setForm({ ...form, totalCost: e.target.value })}
            />
          </Field>
          <Field>
            <StageFieldLabel htmlFor="currency" required>
              {t('stages.fields.currency')}
            </StageFieldLabel>
            <Input
              id="currency"
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            />
          </Field>
          <Field className="md:col-span-2">
            <StageFieldLabel htmlFor="materialDescription" required>
              {t('stages.fields.materialDescription')}
            </StageFieldLabel>
            <Textarea
              id="materialDescription"
              value={form.materialDescription}
              onChange={(e) => setForm({ ...form, materialDescription: e.target.value })}
            />
          </Field>
        </div>
      </StageSection>

      <StageSection title={t('stages.sections.shipment')}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field className="md:col-span-2">
            <StageFieldLabel required>{t('stages.fields.orderDate')}</StageFieldLabel>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
              <DatePicker
                value={parseStageDate(form.orderDate)}
                placeholder={t('stages.placeholders.orderDate')}
                onChange={(date) => setForm({ ...form, orderDate: stageDateToIso(date) })}
              />
              <span className="hidden text-center text-muted-foreground sm:block">
                {t('stages.dateRangeSeparator')}
              </span>
              <DatePicker
                value={parseStageDate(form.expectedArrivalDate)}
                placeholder={t('stages.placeholders.expectedArrivalDate')}
                onChange={(date) => setForm({ ...form, expectedArrivalDate: stageDateToIso(date) })}
              />
            </div>
          </Field>
          <Field>
            <StageFieldLabel optional>{t('stages.fields.actualArrivalDate')}</StageFieldLabel>
            <DatePicker
              value={parseStageDate(form.actualArrivalDate)}
              placeholder={t('stages.placeholders.actualArrivalDate')}
              onChange={(date) => setForm({ ...form, actualArrivalDate: stageDateToIso(date) })}
            />
          </Field>
          <Field className="md:col-span-2">
            <StageFieldLabel htmlFor="materialsNotes" optional>
              {t('stages.fields.notes')}
            </StageFieldLabel>
            <Input
              id="materialsNotes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>
        </div>
      </StageSection>
    </StageBodyShell>
  )
}
