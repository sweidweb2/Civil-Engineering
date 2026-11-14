import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  type Category,
  localizedCategoryName,
  localizedCategoryParentName,
} from '@/services/categories'
import type { InputType } from '@/services/input-types'
import type { StepInput } from '@/services/steps'
import { useLocaleStore } from '@/stores/localeStore'

export type StepInputFormValues = {
  label: string
  inputTypeId: string
  orderNb: string
  categoryId: string
}

export const EMPTY_STEP_INPUT_FORM: StepInputFormValues = {
  label: '',
  inputTypeId: '',
  orderNb: '',
  categoryId: '',
}

export function resolveStepInputTypeCode(
  types: InputType[],
  editing: StepInput | null,
  inputTypeId: string,
): string {
  const fromList = types.find((type) => type.id === inputTypeId)?.code
  if (fromList) return fromList.toUpperCase()
  if (editing && editing.inputTypeId === inputTypeId) return editing.inputTypeCode.toUpperCase()
  return ''
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: StepInput | null
  form: StepInputFormValues
  onFormChange: (next: StepInputFormValues) => void
  typeOptions: InputType[]
  categoryOptions: Category[]
  selectedTypeCode: string
  isSaving: boolean
  onSave: () => void
}

export function StepInputFormDialog({
  open,
  onOpenChange,
  editing,
  form,
  onFormChange,
  typeOptions,
  categoryOptions,
  selectedTypeCode,
  isSaving,
  onSave,
}: Props) {
  const { t } = useTranslation(['admin', 'common'])
  const locale = useLocaleStore((state) => state.locale)
  const categoryOptionLabel = (category: Category) => {
    const name = localizedCategoryName(category, locale)
    const parent = localizedCategoryParentName(category, locale)
    return parent ? `${parent} / ${name}` : name
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editing ? t('admin:stepInputs.editTitle') : t('admin:stepInputs.createTitle')}
          </DialogTitle>
          <DialogDescription>{t('admin:stepInputs.dialogDescription')}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="step-input-label">{t('common:label')}</Label>
            <Input
              id="step-input-label"
              value={form.label}
              maxLength={120}
              placeholder={t('admin:stepInputs.labelPlaceholder')}
              onChange={(event) => onFormChange({ ...form, label: event.target.value })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="step-input-type">{t('admin:stepInputs.inputType')}</Label>
            <Select
              items={typeOptions.map((type) => ({
                value: type.id,
                label: `${type.label} (${type.code})`,
              }))}
              value={form.inputTypeId || undefined}
              onValueChange={(value) => {
                if (!value) return
                const nextCode = resolveStepInputTypeCode(typeOptions, editing, value)
                onFormChange({
                  ...form,
                  inputTypeId: value,
                  categoryId: nextCode === 'CATEGORY' ? form.categoryId : '',
                })
              }}
            >
              <SelectTrigger id="step-input-type" className="w-full">
                <SelectValue placeholder={t('admin:stepInputs.selectType')} />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.label} ({type.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedTypeCode === 'CATEGORY' ? (
            <div className="grid gap-1.5">
              <Label htmlFor="step-input-category">{t('common:category')}</Label>
              <Select
                items={categoryOptions.map((category) => ({
                  value: category.id,
                  label: categoryOptionLabel(category),
                }))}
                value={form.categoryId || undefined}
                onValueChange={(value) => {
                  if (value) onFormChange({ ...form, categoryId: value })
                }}
              >
                <SelectTrigger id="step-input-category" className="w-full">
                  <SelectValue placeholder={t('admin:stepInputs.selectCategory')} />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {categoryOptionLabel(category)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="grid gap-1.5">
            <Label htmlFor="step-input-order">{t('admin:stepInputs.orderOptional')}</Label>
            <Input
              id="step-input-order"
              type="number"
              min={0}
              max={10000}
              value={form.orderNb}
              placeholder={t('common:auto')}
              onChange={(event) => onFormChange({ ...form, orderNb: event.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            {t('common:cancel')}
          </Button>
          <Button type="button" onClick={onSave} disabled={isSaving}>
            {isSaving ? t('common:saving') : t('common:save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
