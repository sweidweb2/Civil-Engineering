import { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, Briefcase, HardHat, Pencil, Trash2, Wrench } from 'lucide-react'
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
import { usePermissions } from '@/hooks/usePermissions'
import { useRemoteData } from '@/hooks/useRemoteData'
import { ellipsis, PAGE_SIZE, pageCount } from '@/lib/text'
import { ApiError } from '@/services/api'
import {
  type Category,
  CATEGORY_KINDS,
  type CategoryKind,
  type CategoryKindCounts,
  createCategory,
  deleteCategory,
  isCategoryKind,
  listCategories,
  updateCategory,
} from '@/services/categories'

const EMPTY_COUNTS: CategoryKindCounts = { MATERIAL: 0, EQUIPMENT: 0, SERVICE: 0, WORKER: 0 }

type CategoryForm = {
  name: string
  kind: CategoryKind
  parentId: string
  isActive: boolean
}

const EMPTY_FORM: CategoryForm = { name: '', kind: 'MATERIAL', parentId: '', isActive: true }

function formFromCategory(category: Category): CategoryForm {
  return {
    name: category.name,
    kind: category.kind,
    parentId: category.parentId ?? '',
    isActive: category.isActive,
  }
}

export function ManageCategoriesPage() {
  const { t } = useTranslation(['admin', 'common'])
  useDocumentTitle(t('admin:categories.documentTitle'))
  const { isAdmin } = usePermissions()
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
  } = useAdminCrudPage<Category, CategoryForm>({
    emptyForm: EMPTY_FORM,
    formFromRow: formFromCategory,
  })
  const [parents, setParents] = useState<Category[]>([])

  const kindLabel = (kind: CategoryKind) => t(`admin:categoryKind.${kind}`)

  const load = useCallback(
    () => listCategories(page, PAGE_SIZE, { q: debouncedQuery || undefined }),
    [debouncedQuery, page],
  )
  const remote = useRemoteData(load, { queryKey: ['categories', page, debouncedQuery] })
  const rows = remote.status === 'success' ? remote.data.data : []
  const total = remote.status === 'success' ? remote.data.meta.total : 0
  const counts = remote.status === 'success' ? remote.data.meta.kindCounts : EMPTY_COUNTS
  const totalPages = pageCount(total)

  useEffect(() => {
    if (!dialogOpen) return
    let cancelled = false
    void listCategories(1, 100, { kind: form.kind })
      .then((result) => {
        if (!cancelled)
          setParents(result.data.filter((row) => row.parentId === null && row.id !== editing?.id))
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(
            error instanceof ApiError ? error.message : t('admin:categories.couldNotLoadParents'),
          )
        }
      })
    return () => {
      cancelled = true
    }
  }, [dialogOpen, editing?.id, form.kind, t])

  const parentOptions = useMemo(() => {
    if (!editing?.parentId || editing.kind !== form.kind) return parents
    if (parents.some((row) => row.id === editing.parentId)) return parents
    return [
      {
        ...editing,
        id: editing.parentId,
        name: editing.parentName ?? t('admin:categories.parentFallback'),
        parentId: null,
        parentName: null,
      },
      ...parents,
    ]
  }, [editing, form.kind, parents, t])

  const deleteBlocked = pendingDelete
    ? pendingDelete.childCount > 0 || pendingDelete.listingCount > 0
    : false

  async function save() {
    const name = form.name.trim()
    if (!name) {
      toast.error(t('admin:categories.nameRequired'))
      return
    }
    const payload = {
      name,
      kind: form.kind,
      parentId: form.parentId || null,
      isActive: form.isActive,
    }
    await withSaving(async () => {
      if (editing) await updateCategory(editing.id, payload)
      else await createCategory(payload)
      setDialogOpen(false)
      toast.message(editing ? t('admin:categories.updated') : t('admin:categories.created'))
      if (!editing) setPage(1)
      await remote.refetch()
    }, t('admin:categories.couldNotSave'))
  }

  async function confirmDelete() {
    if (!pendingDelete || deleteBlocked) return
    const id = pendingDelete.id
    await withBusy(
      id,
      async () => {
        await deleteCategory(id)
        toast.message(t('admin:categories.removedToast'))
        setPendingDelete(null)
        await remote.refetch()
      },
      t('admin:categories.couldNotDelete'),
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        className="mb-0"
        title={t('admin:categories.title')}
        description={
          isAdmin ? t('admin:categories.description') : t('admin:categories.descriptionPm')
        }
        actions={
          isAdmin ? (
            <Button type="button" onClick={openCreate}>
              {t('admin:categories.addCategory')}
            </Button>
          ) : undefined
        }
      />

      <div className={STAT_GRID_CLASS}>
        <StatCard
          icon={Box}
          label={t('admin:categories.metricMaterials')}
          value={counts.MATERIAL}
        />
        <StatCard
          icon={Wrench}
          label={t('admin:categories.metricEquipment')}
          value={counts.EQUIPMENT}
        />
        <StatCard
          icon={Briefcase}
          label={t('admin:categories.metricServices')}
          value={counts.SERVICE}
        />
        <StatCard
          icon={HardHat}
          label={t('admin:categories.metricWorkers')}
          value={counts.WORKER}
        />
      </div>

      <AsyncState
        isLoading={remote.isLoading}
        error={remote.isError ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
        loadingFallback={<TableSkeleton columns={isAdmin ? 5 : 4} />}
      >
        <DataPanel
          toolbar={
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('admin:categories.filterPlaceholder')}
              aria-label={t('admin:categories.filterAria')}
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
                <TableHead>{t('admin:categories.headers.name')}</TableHead>
                <TableHead>{t('admin:categories.headers.kind')}</TableHead>
                <TableHead>{t('admin:categories.headers.parent')}</TableHead>
                <TableHead>{t('admin:categories.headers.status')}</TableHead>
                {isAdmin ? (
                  <TableHead className="text-right">{t('common:actions')}</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 5 : 4} className="text-muted-foreground">
                    {t('admin:categories.noMatch')}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell title={row.name} className="max-w-56 truncate">
                      {ellipsis(row.name, 36)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{kindLabel(row.kind)}</Badge>
                    </TableCell>
                    <TableCell className="max-w-40 truncate" title={row.parentName ?? undefined}>
                      {ellipsis(row.parentName, 24)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.isActive ? 'default' : 'outline'}>
                        {row.isActive ? t('common:active') : t('common:inactive')}
                      </Badge>
                    </TableCell>
                    {isAdmin ? (
                      <TableCell className="text-right">
                        <RowActions>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="outline"
                            aria-label={t('admin:categories.editAria', { name: row.name })}
                            disabled={busyId === row.id}
                            onClick={() => openEdit(row)}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="destructive"
                            aria-label={t('admin:categories.deleteAria', { name: row.name })}
                            disabled={busyId === row.id}
                            onClick={() => setPendingDelete(row)}
                          >
                            <Trash2 />
                          </Button>
                        </RowActions>
                      </TableCell>
                    ) : null}
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
              {editing ? t('admin:categories.editTitle') : t('admin:categories.createTitle')}
            </DialogTitle>
            <DialogDescription>{t('admin:categories.dialogDescription')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="category-name">{t('common:name')}</Label>
              <Input
                id="category-name"
                value={form.name}
                maxLength={80}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="category-kind">{t('admin:categories.headers.kind')}</Label>
              <Select
                items={CATEGORY_KINDS.map((kind) => ({ value: kind, label: kindLabel(kind) }))}
                value={form.kind}
                onValueChange={(value) => {
                  if (value && isCategoryKind(value)) {
                    setForm((current) => ({
                      ...current,
                      kind: value,
                      parentId: current.kind === value ? current.parentId : '',
                    }))
                  }
                }}
              >
                <SelectTrigger id="category-kind" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_KINDS.map((kind) => (
                    <SelectItem key={kind} value={kind}>
                      {kindLabel(kind)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="category-parent">{t('common:parent')}</Label>
              <Select
                items={[
                  { value: 'none', label: t('admin:categories.parentNone') },
                  ...parentOptions.map((option) => ({ value: option.id, label: option.name })),
                ]}
                value={form.parentId || 'none'}
                disabled={Boolean(editing && editing.childCount > 0)}
                onValueChange={(value) => {
                  if (!value) return
                  setForm((current) => ({ ...current, parentId: value === 'none' ? '' : value }))
                }}
              >
                <SelectTrigger id="category-parent" className="w-full">
                  <SelectValue placeholder={t('admin:categories.parentNoneShort')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('admin:categories.parentNone')}</SelectItem>
                  {parentOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="category-active">{t('admin:categories.active')}</Label>
              <Switch
                id="category-active"
                checked={form.isActive}
                onCheckedChange={(checked) =>
                  setForm((current) => ({ ...current, isActive: checked }))
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
        title={t('admin:categories.deleteTitle')}
        description={
          deleteBlocked
            ? t('admin:categories.deleteBlocked')
            : t('admin:categories.deleteDescription', {
                name: pendingDelete?.name ?? t('admin:categories.theCategory'),
              })
        }
        confirmDisabled={deleteBlocked}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  )
}
