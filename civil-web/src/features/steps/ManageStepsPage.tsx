import { useCallback, useState } from 'react'
import { Archive, ListOrdered, ListTree, Pencil, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { AsyncState } from '@/components/feedback/async-state'
import { TableSkeleton } from '@/components/feedback/skeletons'
import {
  DataPanel,
  PageHeader,
  RowActions,
  STAT_GRID_CLASS,
  StatCard,
  TablePager,
} from '@/components/layout'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AdminConfirmDeleteDialog } from '@/features/admin/components/AdminConfirmDeleteDialog'
import { useAdminCrudPage } from '@/features/admin/hooks/useAdminCrudPage'
import { StepInputsPanel } from '@/features/projects/components/StepInputsPanel'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { usePagedQuery } from '@/hooks/usePagedQuery'
import { useRemoteData } from '@/hooks/useRemoteData'
import { ellipsis, PAGE_SIZE, pageCount } from '@/lib/text'
import {
  createStep,
  deleteStep,
  listSteps,
  notifyOrderAdjusted,
  type Step,
  type StepStatus,
  updateStep,
} from '@/services/steps'

type StepForm = {
  name: string
  orderNb: string
  status: StepStatus
}

const EMPTY_FORM: StepForm = { name: '', orderNb: '', status: 'ACTIVE' }

const STATUS_VALUES: StepStatus[] = ['ACTIVE', 'INACTIVE', 'ARCHIVED']

function formFromStep(step: Step): StepForm {
  return {
    name: step.name,
    orderNb: String(step.orderNb),
    status: step.status,
  }
}

type ManageStepsPageProps = {
  /** Hide page chrome when embedded in another settings surface. */
  embedded?: boolean
}

export function ManageStepsPage({ embedded = false }: ManageStepsPageProps) {
  const { t } = useTranslation(['admin', 'common', 'pm'])
  useDocumentTitle(embedded ? t('pm:settings') : t('admin:steps.documentTitle'))
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

  const statusOptions = STATUS_VALUES.map((value) => ({
    value,
    label:
      value === 'ACTIVE'
        ? t('admin:steps.statusActiveNew')
        : value === 'ARCHIVED'
          ? t('admin:steps.statusArchived')
          : t('admin:steps.statusInactive'),
  }))

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

  function statusBadge(status: StepStatus) {
    if (status === 'ACTIVE') return <Badge>{t('admin:steps.statusActive')}</Badge>
    if (status === 'ARCHIVED')
      return <Badge variant="secondary">{t('admin:steps.statusArchived')}</Badge>
    return <Badge variant="outline">{t('admin:steps.statusInactive')}</Badge>
  }

  async function save() {
    const name = form.name.trim()
    if (!name) {
      toast.error(t('admin:steps.nameRequired'))
      return
    }
    if (name.length > 120) {
      toast.error(t('admin:steps.nameMax'))
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
        toast.error(t('admin:steps.orderInvalid'))
        return
      }
      payload.orderNb = orderNb
    }

    await withSaving(async () => {
      const result = editing ? await updateStep(editing.id, payload) : await createStep(payload)
      setDialogOpen(false)
      toast.message(editing ? t('admin:steps.updated') : t('admin:steps.created'))
      const adjusted = notifyOrderAdjusted(result.meta)
      if (adjusted) toast.message(adjusted)
      if (!editing) setPage(1)
      await remote.refetch()
    }, t('admin:steps.couldNotSave'))
  }

  async function toggleActive(row: Step) {
    if (row.status === 'ARCHIVED') return
    const next: StepStatus = row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    await withBusy(
      row.id,
      async () => {
        await updateStep(row.id, { status: next })
        toast.message(
          next === 'ACTIVE' ? t('admin:steps.enabledToast') : t('admin:steps.disabledToast'),
        )
        await remote.refetch()
      },
      t('admin:steps.couldNotUpdateStatus'),
    )
  }

  async function archiveStep(row: Step) {
    await withBusy(
      row.id,
      async () => {
        await updateStep(row.id, { status: 'ARCHIVED' })
        toast.message(t('admin:steps.archivedToast'))
        await remote.refetch()
      },
      t('admin:steps.couldNotArchive'),
    )
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    const id = pendingDelete.id
    await withBusy(
      id,
      async () => {
        await deleteStep(id)
        toast.message(t('admin:steps.removedToast'))
        setPendingDelete(null)
        await remote.refetch()
      },
      t('admin:steps.couldNotDelete'),
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {embedded ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold">{t('admin:steps.embeddedTitle')}</h2>
            <p className="text-sm text-muted-foreground">{t('admin:steps.embeddedDescription')}</p>
          </div>
          <Button type="button" onClick={openCreate}>
            {t('admin:steps.addStep')}
          </Button>
        </div>
      ) : (
        <PageHeader
          className="mb-0"
          title={t('admin:steps.title')}
          description={t('admin:steps.description')}
          actions={
            <Button type="button" onClick={openCreate}>
              {t('admin:steps.addStep')}
            </Button>
          }
        />
      )}

      <div className={STAT_GRID_CLASS}>
        <StatCard icon={ListOrdered} label={t('admin:steps.metricActive')} value={activeCount} />
        <StatCard
          icon={ListOrdered}
          label={t('admin:steps.metricInactive')}
          value={inactiveCount}
        />
        <StatCard icon={Archive} label={t('admin:steps.metricArchived')} value={archivedCount} />
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
              placeholder={t('admin:steps.filterPlaceholder')}
              aria-label={t('admin:steps.filterAria')}
              className="max-w-sm"
              maxLength={80}
            />
          }
          footer={
            <TablePager page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
          }
        >
          <Table startIndex={(page - 1) * PAGE_SIZE}>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin:steps.headers.order')}</TableHead>
                <TableHead>{t('admin:steps.headers.name')}</TableHead>
                <TableHead>{t('admin:steps.headers.fields')}</TableHead>
                <TableHead>{t('admin:steps.headers.inputs')}</TableHead>
                <TableHead>{t('admin:steps.headers.status')}</TableHead>
                <TableHead>{t('admin:steps.headers.active')}</TableHead>
                <TableHead className="text-right">{t('common:actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground">
                    {t('admin:steps.empty')}
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
                        aria-label={t('admin:steps.manageInputsAria', { name: row.name })}
                        title={t('admin:steps.manageInputsTitle')}
                        disabled={busyId === row.id}
                        onClick={() => setInputsStep(row)}
                      >
                        <ListTree />
                        {t('admin:steps.manageInputs')}
                      </Button>
                    </TableCell>
                    <TableCell>{statusBadge(row.status)}</TableCell>
                    <TableCell>
                      {row.status !== 'ARCHIVED' ? (
                        <Switch
                          checked={row.status === 'ACTIVE'}
                          disabled={busyId === row.id}
                          aria-label={
                            row.status === 'ACTIVE'
                              ? t('admin:steps.disableAria', { name: row.name })
                              : t('admin:steps.enableAria', { name: row.name })
                          }
                          title={
                            row.status === 'ACTIVE'
                              ? t('admin:steps.onForNew')
                              : t('admin:steps.offForNew')
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
                          aria-label={t('admin:steps.editAria', { name: row.name })}
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
                            aria-label={t('admin:steps.archiveAria', { name: row.name })}
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
                          aria-label={t('admin:steps.deleteAria', { name: row.name })}
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
            <DialogTitle>
              {editing ? t('admin:steps.editTitle') : t('admin:steps.createTitle')}
            </DialogTitle>
            <DialogDescription>{t('admin:steps.dialogDescription')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="step-name">{t('common:name')}</Label>
              <Input
                id="step-name"
                value={form.name}
                maxLength={120}
                placeholder={t('admin:steps.namePlaceholder')}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="step-order">{t('admin:steps.orderOptional')}</Label>
              <Input
                id="step-order"
                type="number"
                min={0}
                max={10000}
                value={form.orderNb}
                placeholder={t('common:auto')}
                onChange={(event) =>
                  setForm((current) => ({ ...current, orderNb: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="step-status">{t('common:status')}</Label>
              <Select
                items={statusOptions}
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
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isSaving}
            >
              {t('common:cancel')}
            </Button>
            <Button type="button" onClick={() => void save()} disabled={isSaving}>
              {isSaving ? t('common:saving') : t('common:save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AdminConfirmDeleteDialog
        open={pendingDelete !== null}
        title={t('admin:steps.deleteTitle')}
        description={t('admin:steps.deleteDescription', {
          name: pendingDelete?.name ?? t('admin:steps.theStep'),
        })}
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
