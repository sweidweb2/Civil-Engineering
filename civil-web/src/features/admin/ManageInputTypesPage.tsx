import { useCallback, useState } from 'react'
import { FormInput, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { AsyncState } from '@/components/feedback/async-state'
import { TableSkeleton } from '@/components/feedback/skeletons'
import { DataPanel, PageHeader, RowActions, TablePager } from '@/components/layout'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { usePagedQuery } from '@/hooks/usePagedQuery'
import { useRemoteData } from '@/hooks/useRemoteData'
import { ApiError } from '@/services/api'
import {
  createInputType,
  deleteInputType,
  INPUT_TYPE_CODE_OPTIONS,
  type InputType,
  type InputTypeCode,
  type InputTypeStatus,
  listInputTypes,
  updateInputType,
} from '@/services/input-types'

import { STAT_GRID_CLASS, StatCard } from './components/StatCard'
import { ellipsis, PAGE_SIZE, pageCount } from './lib/text'

type FormState = {
  code: InputTypeCode | ''
  label: string
  sortOrder: string
  status: InputTypeStatus
}

const EMPTY_FORM: FormState = { code: 'TEXT', label: '', sortOrder: '0', status: 'ACTIVE' }

function formFromRow(row: InputType): FormState {
  const known = INPUT_TYPE_CODE_OPTIONS.find((option) => option.value === row.code)
  return {
    code: known ? known.value : '',
    label: row.label,
    sortOrder: String(row.sortOrder),
    status: row.status,
  }
}

export function ManageInputTypesPage() {
  useDocumentTitle('Input types')
  const { query, setQuery, debouncedQuery, page, setPage } = usePagedQuery()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<InputType | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<InputType | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(
    () => listInputTypes(page, PAGE_SIZE, { q: debouncedQuery || undefined }),
    [debouncedQuery, page],
  )
  const remote = useRemoteData(load, { queryKey: ['input-types', page, debouncedQuery] })
  const rows = remote.status === 'success' ? remote.data.data : []
  const total = remote.status === 'success' ? remote.data.meta.total : 0
  const activeCount = remote.status === 'success' ? remote.data.meta.activeCount : 0
  const inactiveCount = remote.status === 'success' ? remote.data.meta.inactiveCount : 0
  const totalPages = pageCount(total)
  const isIdentityLocked = Boolean(editing && editing.usageCount > 0)

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(row: InputType) {
    setEditing(row)
    setForm(formFromRow(row))
    setDialogOpen(true)
  }

  async function save() {
    const label = form.label.trim()
    const sortOrder = Number.parseInt(form.sortOrder, 10)
    if (!Number.isFinite(sortOrder) || sortOrder < 0) {
      toast.error('Sort order must be a non-negative number')
      return
    }

    if (isIdentityLocked) {
      setIsSaving(true)
      try {
        await updateInputType(editing!.id, { sortOrder, status: form.status })
        setDialogOpen(false)
        toast.message('Input type updated')
        await remote.refetch()
      } catch (error) {
        toast.error(error instanceof ApiError ? error.message : 'Could not save input type')
      } finally {
        setIsSaving(false)
      }
      return
    }

    if (!form.code || !label) {
      toast.error('Code and label are required')
      return
    }

    const payload = { code: form.code, label, sortOrder, status: form.status }
    setIsSaving(true)
    try {
      if (editing) await updateInputType(editing.id, payload)
      else await createInputType(payload)
      setDialogOpen(false)
      toast.message(editing ? 'Input type updated' : 'Input type created')
      if (!editing) setPage(1)
      await remote.refetch()
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not save input type')
    } finally {
      setIsSaving(false)
    }
  }

  async function toggleStatus(row: InputType) {
    const next: InputTypeStatus = row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    setBusyId(row.id)
    try {
      await updateInputType(row.id, { status: next })
      toast.message(next === 'ACTIVE' ? 'Input type enabled' : 'Input type disabled')
      await remote.refetch()
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not update status')
    } finally {
      setBusyId(null)
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    if (pendingDelete.usageCount > 0) return
    const id = pendingDelete.id
    setBusyId(id)
    try {
      await deleteInputType(id)
      toast.message('Input type removed')
      setPendingDelete(null)
      await remote.refetch()
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not remove input type')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        className="mb-0"
        title="Input types"
        description="Platform field kinds for step inputs. Enable/disable only controls what users can pick for new fields — existing step inputs and project values stay as-is."
        actions={
          <Button type="button" onClick={openCreate}>
            Add type
          </Button>
        }
      />

      <div className={STAT_GRID_CLASS}>
        <StatCard icon={FormInput} label="Active" value={activeCount} />
        <StatCard icon={FormInput} label="Inactive" value={inactiveCount} />
      </div>

      <AsyncState
        isLoading={remote.isLoading}
        error={remote.isError ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
        loadingFallback={<TableSkeleton columns={6} />}
      >
        <DataPanel
          toolbar={
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter input types…"
              aria-label="Filter input types"
              className="max-w-sm"
            />
          }
          footer={<TablePager page={page} totalPages={totalPages} total={total} onPageChange={setPage} />}
        >
          <Table startIndex={(page - 1) * PAGE_SIZE}>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Used</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    No input types yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.code}</TableCell>
                    <TableCell title={row.label}>{ellipsis(row.label, 36)}</TableCell>
                    <TableCell>
                      <Badge variant={row.status === 'ACTIVE' ? 'default' : 'outline'}>
                        {row.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={row.status === 'ACTIVE'}
                        disabled={busyId === row.id}
                        aria-label={`${row.status === 'ACTIVE' ? 'Disable' : 'Enable'} ${row.label}`}
                        title={row.status === 'ACTIVE' ? 'Enabled' : 'Disabled'}
                        onCheckedChange={() => void toggleStatus(row)}
                      />
                    </TableCell>
                    <TableCell className="tabular-nums">{row.usageCount}</TableCell>
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
                          disabled={busyId === row.id || row.usageCount > 0}
                          title={
                            row.usageCount > 0
                              ? 'In use — disable instead of delete'
                              : 'Delete permanently'
                          }
                          onClick={() => setPendingDelete(row)}
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
        </DataPanel>
      </AsyncState>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit input type' : 'Add input type'}</DialogTitle>
            <DialogDescription>
              {isIdentityLocked
                ? 'This type is in use. Code and label are locked — you can still change status and sort order.'
                : 'Pick a code from the list. Only active types appear when adding step inputs.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="input-type-code">Code</Label>
              {isIdentityLocked ? (
                <Input
                  id="input-type-code"
                  value={editing?.code ?? form.code}
                  disabled
                  className="font-mono uppercase"
                />
              ) : (
                <Select
                  value={form.code || undefined}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, code: value as InputTypeCode }))
                  }
                >
                  <SelectTrigger id="input-type-code" className="w-full font-mono">
                    <SelectValue placeholder="Select code" />
                  </SelectTrigger>
                  <SelectContent>
                    {INPUT_TYPE_CODE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.value} — {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="input-type-label">Label</Label>
              <Input
                id="input-type-label"
                value={form.label}
                maxLength={80}
                disabled={isIdentityLocked}
                onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="input-type-order">Sort order</Label>
              <Input
                id="input-type-order"
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={(event) =>
                  setForm((current) => ({ ...current, sortOrder: event.target.value }))
                }
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="input-type-active">Active</Label>
              <Switch
                id="input-type-active"
                checked={form.status === 'ACTIVE'}
                onCheckedChange={(checked) =>
                  setForm((current) => ({ ...current, status: checked ? 'ACTIVE' : 'INACTIVE' }))
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

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove input type</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete && pendingDelete.usageCount > 0
                ? 'This type is still used by step inputs or projects. Disable it instead.'
                : `This permanently removes ${pendingDelete?.label ?? 'the type'} and cannot be recovered.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={Boolean(pendingDelete && pendingDelete.usageCount > 0)}
              onClick={() => void confirmDelete()}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
