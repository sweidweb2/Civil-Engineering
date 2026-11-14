import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

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
import { useRemoteData } from '@/hooks/useRemoteData'
import { type Category, listCategories } from '@/services/categories'
import {
  INPUT_TYPES_PICKER_QUERY_KEY,
  type InputType,
  listInputTypesForPicker,
} from '@/services/input-types'

export type AddStepperInputValues = {
  label: string
  inputTypeId: string
  categoryId: string | null
}

type AddStepperInputDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  isAdding: boolean
  /** Resolves true when the input was created (dialog clears label/category). */
  onSubmit: (values: AddStepperInputValues) => Promise<boolean>
}

export function AddStepperInputDialog({
  open,
  onOpenChange,
  isAdding,
  onSubmit,
}: AddStepperInputDialogProps) {
  const { t } = useTranslation(['projects', 'common'])
  const [label, setLabel] = useState('')
  const [typeId, setTypeId] = useState('')
  const [categoryId, setCategoryId] = useState('')

  const loadPickerTypes = useCallback(() => listInputTypesForPicker(), [])
  const typesRemote = useRemoteData(loadPickerTypes, {
    queryKey: [...INPUT_TYPES_PICKER_QUERY_KEY],
    enabled: open,
  })
  const typesData = typesRemote.status === 'success' ? typesRemote.data.data : null
  const types = useMemo<InputType[]>(() => typesData ?? [], [typesData])

  const loadCategories = useCallback(() => listCategories(1, 100), [])
  const categoriesRemote = useRemoteData(loadCategories, {
    queryKey: ['categories', 'project-step-input-picker'],
    enabled: open,
  })
  const categories: Category[] =
    categoriesRemote.status === 'success' ? categoriesRemote.data.data : []

  const typeCode = types.find((type) => type.id === typeId)?.code.toUpperCase() ?? ''

  useEffect(() => {
    if (!open || types.length === 0) return
    setTypeId((current) => current || types[0]?.id || '')
  }, [open, types])

  async function submit() {
    const trimmed = label.trim()
    if (!trimmed) {
      toast.error(t('projects:labelRequired'))
      return
    }
    if (!typeId) {
      toast.error(t('projects:inputTypeRequired'))
      return
    }
    if (typeCode === 'CATEGORY' && !categoryId) {
      toast.error(t('projects:categoryRequired'))
      return
    }
    const created = await onSubmit({
      label: trimmed,
      inputTypeId: typeId,
      categoryId: typeCode === 'CATEGORY' ? categoryId : null,
    })
    if (created) {
      setLabel('')
      setCategoryId('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('projects:addProjectInput')}</DialogTitle>
          <DialogDescription>
            This field is only for the selected stepper on this project.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="project-input-label">{t('projects:inputLabel')}</Label>
            <Input
              id="project-input-label"
              value={label}
              maxLength={120}
              placeholder={t('projects:inputLabelPlaceholder')}
              onChange={(event) => setLabel(event.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="project-input-type">{t('projects:inputType')}</Label>
            <Select
              items={types.map((type) => ({
                value: type.id,
                label: `${type.label} (${type.code})`,
              }))}
              value={typeId || undefined}
              onValueChange={(value) => {
                if (!value) return
                const nextCode = types.find((type) => type.id === value)?.code.toUpperCase() ?? ''
                setTypeId(value)
                if (nextCode !== 'CATEGORY') setCategoryId('')
              }}
            >
              <SelectTrigger id="project-input-type" className="w-full">
                <SelectValue placeholder={t('projects:selectInputType')} />
              </SelectTrigger>
              <SelectContent>
                {types.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.label} ({type.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {typeCode === 'CATEGORY' ? (
            <div className="grid gap-1.5">
              <Label htmlFor="project-input-category">{t('common:category')}</Label>
              <Select
                items={categories.map((category) => ({
                  value: category.id,
                  label: category.parentName
                    ? `${category.parentName} / ${category.name}`
                    : category.name,
                }))}
                value={categoryId || undefined}
                onValueChange={(value) => {
                  if (value) setCategoryId(value)
                }}
              >
                <SelectTrigger id="project-input-category" className="w-full">
                  <SelectValue placeholder={t('projects:selectCategory')} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.parentName
                        ? `${category.parentName} / ${category.name}`
                        : category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isAdding}
          >
            {t('common:cancel')}
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={isAdding}>
            {isAdding ? t('projects:adding') : t('common:add')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
