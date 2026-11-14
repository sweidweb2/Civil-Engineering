import { useCallback, useEffect, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { AsyncState } from '@/components/feedback/async-state'
import { TableSkeleton } from '@/components/feedback/skeletons'
import { RowActions } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useRemoteData } from '@/hooks/useRemoteData'
import { ellipsis } from '@/lib/text'
import { ApiError } from '@/services/api'
import { type Category, listCategories } from '@/services/categories'
import {
  INPUT_TYPES_PICKER_QUERY_KEY,
  type InputType,
  listInputTypesForPicker,
} from '@/services/input-types'
import {
  createStepInput,
  deleteStepInput,
  listStepInputs,
  notifyOrderAdjusted,
  type Step,
  type StepInput,
  updateStepInput,
} from '@/services/steps'

import {
  EMPTY_STEP_INPUT_FORM,
  resolveStepInputTypeCode,
  StepInputFormDialog,
  type StepInputFormValues,
} from './StepInputFormDialog'

type StepInputsPanelProps = {
  step: Step | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onChanged: () => void
}

export function StepInputsPanel({ step, open, onOpenChange, onChanged }: StepInputsPanelProps) {
  const { t } = useTranslation(['admin', 'common'])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<StepInput | null>(null)
  const [form, setForm] = useState<StepInputFormValues>(EMPTY_STEP_INPUT_FORM)
  const [isSaving, setIsSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const load = useCallback(async () => {
    if (!step) {
      return { data: [] as StepInput[], meta: { page: 1, limit: 100, total: 0 } }
    }
    return listStepInputs(step.id, 1, 100)
  }, [step])

  const remote = useRemoteData(load, {
    queryKey: ['step-inputs', step?.id ?? 'none'],
    enabled: open && Boolean(step),
  })
  const rows = remote.status === 'success' ? remote.data.data : []
  const totalInputs = remote.status === 'success' ? remote.data.meta.total : 0

  const loadPickerTypes = useCallback(() => listInputTypesForPicker(), [])
  const typesRemote = useRemoteData(loadPickerTypes, {
    queryKey: [...INPUT_TYPES_PICKER_QUERY_KEY],
    enabled: open,
  })
  const types: InputType[] = typesRemote.status === 'success' ? typesRemote.data.data : []

  const loadCategories = useCallback(() => listCategories(1, 100), [])
  const categoriesRemote = useRemoteData(loadCategories, {
    queryKey: ['categories', 'step-input-picker'],
    enabled: open,
  })
  const categories: Category[] =
    categoriesRemote.status === 'success' ? categoriesRemote.data.data : []

  useEffect(() => {
    if (typesRemote.isError) {
      toast.error(
        typesRemote.error instanceof ApiError
          ? typesRemote.error.message
          : t('admin:stepInputs.couldNotLoadTypes'),
      )
    }
  }, [t, typesRemote.error, typesRemote.isError])

  function openCreate() {
    setEditing(null)
    setForm({
      ...EMPTY_STEP_INPUT_FORM,
      inputTypeId: types[0]?.id ?? '',
    })
    setDialogOpen(true)
  }

  function openEdit(row: StepInput) {
    setEditing(row)
    setForm({
      label: row.label,
      inputTypeId: row.inputTypeId,
      orderNb: String(row.orderNb),
      categoryId: row.categoryId ?? '',
    })
    setDialogOpen(true)
  }

  async function save() {
    if (!step) return
    const label = form.label.trim()
    if (!label) {
      toast.error(t('admin:stepInputs.labelRequired'))
      return
    }
    if (label.length > 120) {
      toast.error(t('admin:stepInputs.labelMax'))
      return
    }
    if (!form.inputTypeId) {
      toast.error(t('admin:stepInputs.typeRequired'))
      return
    }
    const typeCode = resolveStepInputTypeCode(types, editing, form.inputTypeId)
    if (typeCode === 'CATEGORY' && !form.categoryId) {
      toast.error(t('admin:stepInputs.categoryRequired'))
      return
    }

    const payload: {
      label: string
      inputTypeId: string
      orderNb?: number
      categoryId: string | null
    } = {
      label,
      inputTypeId: form.inputTypeId,
      categoryId: typeCode === 'CATEGORY' ? form.categoryId : null,
    }
    const orderRaw = form.orderNb.trim()
    if (orderRaw !== '') {
      const orderNb = Number.parseInt(orderRaw, 10)
      if (!Number.isFinite(orderNb) || orderNb < 0 || orderNb > 10000) {
        toast.error(t('admin:stepInputs.orderInvalid'))
        return
      }
      payload.orderNb = orderNb
    }

    setIsSaving(true)
    try {
      const result = editing
        ? await updateStepInput(step.id, editing.id, payload)
        : await createStepInput(step.id, payload)
      setDialogOpen(false)
      toast.message(editing ? t('admin:stepInputs.updated') : t('admin:stepInputs.created'))
      const adjusted = notifyOrderAdjusted(result.meta)
      if (adjusted) toast.message(adjusted)
      await remote.refetch()
      onChanged()
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('admin:stepInputs.couldNotSave'))
    } finally {
      setIsSaving(false)
    }
  }

  async function remove(row: StepInput) {
    if (!step) return
    setBusyId(row.id)
    try {
      await deleteStepInput(step.id, row.id)
      toast.message(t('admin:stepInputs.removedToast'))
      await remote.refetch()
      onChanged()
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('admin:stepInputs.couldNotRemove'))
    } finally {
      setBusyId(null)
    }
  }

  const typeOptions =
    editing && !types.some((type) => type.id === editing.inputTypeId)
      ? [
          {
            id: editing.inputTypeId,
            code: editing.inputTypeCode,
            label: t('admin:stepInputs.disabledType', { label: editing.inputTypeLabel }),
            status: 'INACTIVE' as const,
            sortOrder: 0,
            usageCount: 0,
            createdAt: '',
            updatedAt: '',
          },
          ...types,
        ]
      : types

  const selectedTypeCode = resolveStepInputTypeCode(typeOptions, editing, form.inputTypeId)
  const categoryOptions =
    editing?.categoryId && !categories.some((category) => category.id === editing.categoryId)
      ? [
          {
            id: editing.categoryId,
            kind: 'MATERIAL' as const,
            name: t('admin:stepInputs.boundCategory'),
            slug: '',
            parentId: null,
            parentName: null,
            isActive: true,
            sortOrder: 0,
            childCount: 0,
            listingCount: 0,
            createdAt: '',
            updatedAt: '',
          },
          ...categories,
        ]
      : categories

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex w-full flex-col sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{t('admin:stepInputs.title')}</SheetTitle>
            <SheetDescription>
              {t('admin:stepInputs.description', {
                name: step?.name ?? t('admin:stepInputs.thisStep'),
              })}
            </SheetDescription>
          </SheetHeader>

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {totalInputs > rows.length
                ? t('admin:stepInputs.countOf', { shown: rows.length, total: totalInputs })
                : t('admin:stepInputs.count', { count: rows.length })}
            </p>
            <Button type="button" size="sm" onClick={openCreate} disabled={types.length === 0}>
              <Plus />
              {t('admin:stepInputs.addInput')}
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <AsyncState
              isLoading={remote.isLoading}
              error={remote.isError ? remote.error : undefined}
              onRetry={() => void remote.refetch()}
              loadingFallback={<TableSkeleton columns={3} />}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common:order')}</TableHead>
                    <TableHead>{t('common:label')}</TableHead>
                    <TableHead>{t('common:type')}</TableHead>
                    <TableHead className="text-right">{t('common:actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground">
                        {t('admin:stepInputs.empty')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="tabular-nums">{row.orderNb}</TableCell>
                        <TableCell title={row.label}>{ellipsis(row.label, 32)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{row.inputTypeLabel}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <RowActions>
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="outline"
                              aria-label={t('admin:stepInputs.editAria', { name: row.label })}
                              disabled={busyId === row.id}
                              onClick={() => openEdit(row)}
                            >
                              <Pencil />
                            </Button>
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="destructive"
                              aria-label={t('admin:stepInputs.deleteAria', { name: row.label })}
                              disabled={busyId === row.id}
                              onClick={() => void remove(row)}
                            >
                              <Trash2 />
                            </Button>
                          </RowActions>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </AsyncState>
          </div>
        </SheetContent>
      </Sheet>

      <StepInputFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        form={form}
        onFormChange={setForm}
        typeOptions={typeOptions}
        categoryOptions={categoryOptions}
        selectedTypeCode={selectedTypeCode}
        isSaving={isSaving}
        onSave={() => void save()}
      />
    </>
  )
}
