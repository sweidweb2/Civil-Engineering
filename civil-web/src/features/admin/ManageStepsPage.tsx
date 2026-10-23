import { useCallback, useState } from 'react'
import { Archive, ListOrdered, ListTree, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { AsyncState } from '@/components/feedback/async-state'
import { TableSkeleton } from '@/components/feedback/skeletons'
import { DataPanel, PageHeader, RowActions, TablePager } from '@/components/layout'
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
import {
  createStep,
  deleteStep,
  listSteps,
  notifyOrderAdjusted,
  type Step,
  type StepStatus,
  updateStep,
} from '@/services/steps'

import { AdminConfirmDeleteDialog } from './components/AdminConfirmDeleteDialog'
import { STAT_GRID_CLASS, StatCard } from './components/StatCard'
import { StepInputsPanel } from './components/StepInputsPanel'
import { useAdminCrudPage } from './hooks/useAdminCrudPage'
import { ellipsis, PAGE_SIZE, pageCount } from './lib/text'

type StepForm = {
  name: string
  orderNb: string
  status: StepStatus
}

const EMPTY_FORM: StepForm = { name: '', orderNb: '', status: 'ACTIVE' }

const STATUS_OPTIONS: Array<{ value: StepStatus; label: string }> = [
  { value: 'ACTIVE', label: 'Active (new projects)' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'ARCHIVED', label: 'Archived' },
]

function formFromStep(step: Step): StepForm {
  return {
    name: step.name,
    orderNb: String(step.orderNb),
    status: step.status,
  }
}

function statusBadge(status: StepStatus) {
  if (status === 'ACTIVE') return <Badge>Active</Badge>
  if (status === 'ARCHIVED') return <Badge variant="secondary">Archived</Badge>
  return <Badge variant="outline">Inactive</Badge>
}

type ManageStepsPageProps = {
  /** Hide page chrome when embedded in another settings surface. */
  embedded?: boolean
}

export function ManageStepsPage({ embedded = false }: ManageStepsPageProps) {
  useDocumentTitle(embedded ? 'Settings' : 'Manage steps')
  const { query, setQuery, debouncedQuery, page, setPage } = usePagedQuery()
  const {
    dialogOpen,
    setDialogOpen,
    editing,
    form,
    setForm,
    isSaving,
    pendingDelete,
    setPendingDelete,
    busyId,
    openCreate,
    openEdit,
    withSaving,
    withBusy,
  } = useAdminCrudPage<Step, StepForm>({
    emptyForm: EMPTY_FORM,
    formFromRow: formFromStep,
  })
  const [inputsStep, setInputsStep] = useState<Step | null>(null)

  const load = useCallback(
    () => listSteps(page, PAGE_SIZE, { q: debouncedQuery || undefined }),
    [debouncedQuery, page],
  )
  const remote = useRemoteData(load, { queryKey: ['steps', page, debouncedQuery] })
  const rows = remote.status === 'success' ? remote.data.data : []
  const total = remote.status === 'success' ? remote.data.meta.total : 0
  const activeCount = remote.status === 'success' ? remote.data.meta.activeCount : 0
  const inactiveCount = remote.status === 'success' ? remote.data.meta.inactiveCount : 0
  const archivedCount = remote.status === 'success' ? remote.data.meta.archivedCount : 0
  const totalPages = pageCount(total)

  async function save() {
    const name = form.name.trim()
    if (!name) {
      toast.error('Name is required (1–120 characters)')
      return
    }
    if (name.length > 120) {
      toast.error('Name must be at most 120 characters')
      return
    }

    const payload: { name: string; status: StepStatus; orderNb?: number } = {
      name,
      status: form.status,
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

    await withSaving(async () => {
      const result = editing ? await updateStep(editing.id, payload) : await createStep(payload)
      setDialogOpen(false)
      toast.message(editing ? 'Step updated' : 'Step created')
      const adjusted = notifyOrderAdjusted(result.meta)
      if (adjusted) toast.message(adjusted)
      if (!editing) setPage(1)
      await remote.refetch()
    }, 'Could not save step')
  }

  async function toggleActive(row: Step) {
    if (row.status === 'ARCHIVED') return
    const next: StepStatus = row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    await withBusy(
      row.id,
      async () => {
        await updateStep(row.id, { status: next })
        toast.message(
          next === 'ACTIVE'
            ? 'Step enabled for new projects'
            : 'Step disabled for new projects (existing projects unchanged)',
        )
        await remote.refetch()
      },
      'Could not update status',
    )
  }

  async function archiveStep(row: Step) {
    await withBusy(
      row.id,
      async () => {
        await updateStep(row.id, { status: 'ARCHIVED' })
        toast.message('Step archived — it will not be added to new projects')
        await remote.refetch()
      },
      'Could not archive step',
    )
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    const id = pendingDelete.id
    await withBusy(
      id,
      async () => {
        await deleteStep(id)
        toast.message('Step removed (existing projects keep their cloned project steps)')
        setPendingDelete(null)
        await remote.refetch()
      },
      'Could not remove step',
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {embedded ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold">Steps</h2>
            <p className="text-sm text-muted-foreground">
              Active steps are assigned when you create a project.
            </p>
          </div>
          <Button type="button" onClick={openCreate}>
            Add step
          </Button>
        </div>
      ) : (
        <PageHeader
          className="mb-0"
          title="Manage steps"
          description="Active steps are assigned when you create a project. Inactive/archived steps leave existing projects unchanged."
          actions={
            <Button type="button" onClick={openCreate}>
              Add step
            </Button>
          }
        />
      )}

      <div className={STAT_GRID_CLASS}>
        <StatCard icon={ListOrdered} label="Active" value={activeCount} />
        <StatCard icon={ListOrdered} label="Inactive" value={inactiveCount} />
        <StatCard icon={Archive} label="Archived" value={archivedCount} />
      </div>

      <AsyncState
        isLoading={remote.isLoading}
        error={remote.isError ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
        loadingFallback={<TableSkeleton columns={7} />}
      >
        <DataPanel
          toolbar={
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter steps…"
              aria-label="Filter steps"
              className="max-w-sm"
              maxLength={80}
            />
          }
          footer={<TablePager page={page} totalPages={totalPages} total={total} onPageChange={setPage} />}
        >
          <Table startIndex={(page - 1) * PAGE_SIZE}>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Fields</TableHead>
                <TableHead>Inputs</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground">
                    No steps yet. Add templates to assign on new projects.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="tabular-nums">{row.orderNb}</TableCell>
                    <TableCell title={row.name} className="max-w-72 truncate">
                      {ellipsis(row.name, 48)}
                    </TableCell>
                    <TableCell className="tabular-nums">{row.inputCount}</TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        aria-label={`Manage inputs for ${row.name}`}
                        title="Manage step inputs"
                        disabled={busyId === row.id}
                        onClick={() => setInputsStep(row)}
                      >
                        <ListTree />
                        Inputs
                      </Button>
                    </TableCell>
                    <TableCell>{statusBadge(row.status)}</TableCell>
                    <TableCell>
                      {row.status !== 'ARCHIVED' ? (
                        <Switch
                          checked={row.status === 'ACTIVE'}
                          disabled={busyId === row.id}
                          aria-label={`${row.status === 'ACTIVE' ? 'Disable' : 'Enable'} ${row.name} for new projects`}
                          title={
                            row.status === 'ACTIVE'
                              ? 'On for new projects'
                              : 'Off for new projects'
                          }
                          onCheckedChange={() => void toggleActive(row)}
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <RowActions>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="outline"
                          aria-label={`Edit ${row.name}`}
                          disabled={busyId === row.id}
                          onClick={() => openEdit(row)}
                        >
                          <Pencil />
                        </Button>
                        {row.status !== 'ARCHIVED' ? (
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="outline"
                            aria-label={`Archive ${row.name}`}
                            disabled={busyId === row.id}
                            onClick={() => void archiveStep(row)}
                          >
                            <Archive />
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="destructive"
                          aria-label={`Delete ${row.name}`}
                          disabled={busyId === row.id}
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
            <DialogTitle>{editing ? 'Edit step' : 'Add step'}</DialogTitle>
            <DialogDescription>
              Leave order empty to auto-assign the next free slot. Only active steps are linked to new
              projects.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="step-name">Name</Label>
              <Input
                id="step-name"
                value={form.name}
                maxLength={120}
                placeholder="Step name"
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="step-order">Order (optional)</Label>
              <Input
                id="step-order"
                type="number"
                min={0}
                max={10000}
                value={form.orderNb}
                placeholder="Auto"
                onChange={(event) => setForm((current) => ({ ...current, orderNb: event.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="step-status">Status</Label>
              <Select
                items={STATUS_OPTIONS}
                value={form.status}
                onValueChange={(value) => {
                  if (value === 'ACTIVE' || value === 'INACTIVE' || value === 'ARCHIVED') {
                    setForm((current) => ({ ...current, status: value }))
                  }
                }}
              >
                <SelectTrigger id="step-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      <AdminConfirmDeleteDialog
        open={pendingDelete !== null}
        title="Remove step"
        description={`This permanently removes ${pendingDelete?.name ?? 'the step'} from your templates. Existing projects keep their own cloned project steps and inputs.`}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        onConfirm={() => void confirmDelete()}
      />

      <StepInputsPanel
        step={inputsStep}
        open={inputsStep !== null}
        onOpenChange={(next) => {
          if (!next) setInputsStep(null)
        }}
        onChanged={() => void remote.refetch()}
      />
    </div>
  )
}
