import { useCallback } from 'react'
import { FormInput, Pencil, Trash2 } from 'lucide-react'
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
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { usePagedQuery } from '@/hooks/usePagedQuery'
import { useRemoteData } from '@/hooks/useRemoteData'
import { ellipsis, PAGE_SIZE, pageCount } from '@/lib/text'
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
  const { t } = useTranslation(['admin', 'common'])
  useDocumentTitle(t('admin:inputTypes.documentTitle'))
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
  } = useAdminCrudPage<InputType, FormState>({
    emptyForm: EMPTY_FORM,
    formFromRow,
  })

  const load = useCallback(
    () =>
      listInputTypes(page, PAGE_SIZE, {
        q: debouncedQuery || undefined,
        includeUsage: true,
      }),
    [debouncedQuery, page],
  )
  const remote = useRemoteData(load, {
    queryKey: ['input-types', 'admin', page, debouncedQuery],
  })
  const rows = remote.status === 'success' ? remote.data.data : []
  const total = remote.status === 'success' ? remote.data.meta.total : 0
  const activeCount = remote.status === 'success' ? remote.data.meta.activeCount : 0
  const inactiveCount = remote.status === 'success' ? remote.data.meta.inactiveCount : 0
  const totalPages = pageCount(total)
  const isIdentityLocked = Boolean(editing && editing.usageCount > 0)

  async function save() {
    const label = form.label.trim()
    const sortOrder = Number.parseInt(form.sortOrder, 10)
    if (!Number.isFinite(sortOrder) || sortOrder < 0) {
      toast.error(t('admin:inputTypes.sortOrderInvalid'))
      return
    }

    if (isIdentityLocked) {
      await withSaving(async () => {
        await updateInputType(editing!.id, { sortOrder, status: form.status })
        setDialogOpen(false)
        toast.message(t('admin:inputTypes.updated'))
        await remote.refetch()
      }, t('admin:inputTypes.couldNotSave'))
      return
    }

    if (!form.code || !label) {
      toast.error(t('admin:inputTypes.codeAndLabelRequired'))
      return
    }

    const payload = { code: form.code, label, sortOrder, status: form.status }
    await withSaving(async () => {
      if (editing) await updateInputType(editing.id, payload)
      else await createInputType(payload)
      setDialogOpen(false)
      toast.message(editing ? t('admin:inputTypes.updated') : t('admin:inputTypes.created'))
      if (!editing) setPage(1)
      await remote.refetch()
    }, t('admin:inputTypes.couldNotSave'))
  }

  async function toggleStatus(row: InputType) {
    const next: InputTypeStatus = row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    await withBusy(
      row.id,
      async () => {
        await updateInputType(row.id, { status: next })
        toast.message(
          next === 'ACTIVE'
            ? t('admin:inputTypes.enabledToast')
            : t('admin:inputTypes.disabledToast'),
        )
        await remote.refetch()
      },
      t('admin:inputTypes.couldNotUpdateStatus'),
    )
  }

  async function confirmDelete() {
    if (!pendingDelete || pendingDelete.usageCount > 0) return
    const id = pendingDelete.id
    await withBusy(
      id,
      async () => {
        await deleteInputType(id)
        toast.message(t('admin:inputTypes.removedToast'))
        setPendingDelete(null)
        await remote.refetch()
      },
      t('admin:inputTypes.couldNotDelete'),
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        className="mb-0"
        title={t('admin:inputTypes.title')}
        description={t('admin:inputTypes.description')}
        actions={
          <Button type="button" onClick={openCreate}>
            {t('admin:inputTypes.addType')}
          </Button>
        }
      />

      <div className={STAT_GRID_CLASS}>
        <StatCard icon={FormInput} label={t('admin:inputTypes.metricActive')} value={activeCount} />
        <StatCard
          icon={FormInput}
          label={t('admin:inputTypes.metricInactive')}
          value={inactiveCount}
        />
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
              placeholder={t('admin:inputTypes.filterPlaceholder')}
              aria-label={t('admin:inputTypes.filterAria')}
              className="max-w-sm"
            />
          }
          footer={
            <TablePager page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
          }
        >
          <Table startIndex={(page - 1) * PAGE_SIZE}>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin:inputTypes.headers.code')}</TableHead>
                <TableHead>{t('admin:inputTypes.headers.label')}</TableHead>
                <TableHead>{t('admin:inputTypes.headers.status')}</TableHead>
                <TableHead>{t('admin:inputTypes.headers.active')}</TableHead>
                <TableHead>{t('admin:inputTypes.headers.used')}</TableHead>
                <TableHead className="text-right">{t('common:actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    {t('admin:inputTypes.empty')}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.code}</TableCell>
                    <TableCell title={row.label}>{ellipsis(row.label, 36)}</TableCell>
                    <TableCell>
                      <Badge variant={row.status === 'ACTIVE' ? 'default' : 'outline'}>
                        {row.status === 'ACTIVE' ? t('common:active') : t('common:inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={row.status === 'ACTIVE'}
                        disabled={busyId === row.id}
                        aria-label={
                          row.status === 'ACTIVE'
                            ? t('admin:inputTypes.disableAria', { name: row.label })
                            : t('admin:inputTypes.enableAria', { name: row.label })
                        }
                        title={row.status === 'ACTIVE' ? t('common:enabled') : t('common:disabled')}
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
                          aria-label={t('admin:inputTypes.editAria', { name: row.label })}
                          disabled={busyId === row.id}
                          onClick={() => openEdit(row)}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="destructive"
                          aria-label={t('admin:inputTypes.deleteAria', { name: row.label })}
                          disabled={busyId === row.id || row.usageCount > 0}
                          title={
                            row.usageCount > 0
                              ? t('admin:inputTypes.inUseTitle')
                              : t('admin:inputTypes.deletePermanently')
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
            <DialogTitle>
              {editing ? t('admin:inputTypes.editTitle') : t('admin:inputTypes.createTitle')}
            </DialogTitle>
            <DialogDescription>
              {isIdentityLocked
                ? t('admin:inputTypes.dialogDescriptionLocked')
                : t('admin:inputTypes.dialogDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="input-type-code">{t('common:code')}</Label>
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
                    <SelectValue placeholder={t('admin:inputTypes.selectCode')} />
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
              <Label htmlFor="input-type-label">{t('common:label')}</Label>
              <Input
                id="input-type-label"
                value={form.label}
                maxLength={80}
                disabled={isIdentityLocked}
                onChange={(event) =>
                  setForm((current) => ({ ...current, label: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="input-type-order">{t('admin:inputTypes.sortOrder')}</Label>
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
              <Label htmlFor="input-type-active">{t('common:active')}</Label>
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
        title={t('admin:inputTypes.deleteTitle')}
        description={
          pendingDelete && pendingDelete.usageCount > 0
            ? t('admin:inputTypes.deleteBlocked')
            : t('admin:inputTypes.deleteDescription', {
                label: pendingDelete?.label ?? t('admin:inputTypes.theType'),
              })
        }
        confirmDisabled={Boolean(pendingDelete && pendingDelete.usageCount > 0)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  )
}
