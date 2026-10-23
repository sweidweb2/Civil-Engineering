import { useCallback, useEffect, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { AsyncState } from '@/components/feedback/async-state'
import { TableSkeleton } from '@/components/feedback/skeletons'
import { RowActions } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
import { ApiError } from '@/services/api'
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

import { ellipsis } from '../lib/text'

type StepInputsPanelProps = {
  step: Step | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onChanged: () => void
}

type InputForm = {
  label: string
  inputTypeId: string
  orderNb: string
}

const EMPTY_FORM: InputForm = { label: '', inputTypeId: '', orderNb: '' }

export function StepInputsPanel({ step, open, onOpenChange, onChanged }: StepInputsPanelProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<StepInput | null>(null)
  const [form, setForm] = useState<InputForm>(EMPTY_FORM)
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

  useEffect(() => {
    if (typesRemote.isError) {
      toast.error(
        typesRemote.error instanceof ApiError
          ? typesRemote.error.message
          : 'Could not load input types',
      )
    }
  }, [typesRemote.error, typesRemote.isError])

  function openCreate() {
    setEditing(null)
    setForm({
      ...EMPTY_FORM,
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
    })
    setDialogOpen(true)
  }

  async function save() {
    if (!step) return
    const label = form.label.trim()
    if (!label) {
      toast.error('Label is required (1–120 characters)')
      return
    }
    if (label.length > 120) {
      toast.error('Label must be at most 120 characters')
      return
    }
    if (!form.inputTypeId) {
      toast.error('Input type is required')
      return
    }

    const payload: { label: string; inputTypeId: string; orderNb?: number } = {
      label,
      inputTypeId: form.inputTypeId,
    }
    const orderRaw = form.orderNb.trim()
    if (orderRaw !== '') {
      const orderNb = Number.parseInt(orderRaw, 10)
      if (!Number.isFinite(orderNb) || orderNb < 0 || orderNb > 10000) {
        toast.error('Order must be an integer from 0 to 10000')
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
      toast.message(editing ? 'Input updated' : 'Input added')
      const adjusted = notifyOrderAdjusted(result.meta)
      if (adjusted) toast.message(adjusted)
      await remote.refetch()
      onChanged()
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not save input')
    } finally {
      setIsSaving(false)
    }
  }

  async function remove(row: StepInput) {
    if (!step) return
    setBusyId(row.id)
    try {
      await deleteStepInput(step.id, row.id)
      toast.message('Input removed (existing projects keep their cloned fields)')
      await remote.refetch()
      onChanged()
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not remove input')
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
            label: `${editing.inputTypeLabel} (disabled type)`,
            status: 'INACTIVE' as const,
            sortOrder: 0,
            usageCount: 0,
            createdAt: '',
            updatedAt: '',
          },
          ...types,
        ]
      : types

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex w-full flex-col sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Step inputs</SheetTitle>
            <SheetDescription>
              Template fields for {step?.name ?? 'this step'}. New projects clone these; editing here
              does not change fields already cloned onto existing projects.
            </SheetDescription>
          </SheetHeader>

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {rows.length}
              {totalInputs > rows.length ? ` of ${totalInputs}` : ''} input(s)
            </p>
            <Button type="button" size="sm" onClick={openCreate} disabled={types.length === 0}>
              <Plus />
              Add input
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
                    <TableHead>Order</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground">
                        No inputs on this step yet.
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
                              aria-label={`Edit ${row.label}`}
                              disabled={busyId === row.id}
                              onClick={() => openEdit(row)}
                            >
                              <Pencil />
                            </Button>
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="destructive"
                              aria-label={`Delete ${row.label}`}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit input' : 'Add input'}</DialogTitle>
            <DialogDescription>
              Leave order empty to auto-assign the next free slot on this step.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="step-input-label">Label</Label>
              <Input
                id="step-input-label"
                value={form.label}
                maxLength={120}
                placeholder="Input label"
                onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="step-input-type">Input type</Label>
              <Select
                items={typeOptions.map((type) => ({
                  value: type.id,
                  label: `${type.label} (${type.code})`,
                }))}
                value={form.inputTypeId || undefined}
                onValueChange={(value) => {
                  if (value) setForm((current) => ({ ...current, inputTypeId: value }))
                }}
              >
                <SelectTrigger id="step-input-type" className="w-full">
                  <SelectValue placeholder="Select type" />
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
            <div className="grid gap-1.5">
              <Label htmlFor="step-input-order">Order (optional)</Label>
              <Input
                id="step-input-order"
                type="number"
                min={0}
                max={10000}
                value={form.orderNb}
                placeholder="Auto"
                onChange={(event) =>
                  setForm((current) => ({ ...current, orderNb: event.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void save()} disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  )
}
