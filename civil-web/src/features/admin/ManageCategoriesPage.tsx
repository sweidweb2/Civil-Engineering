import { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, Briefcase, HardHat, Pencil, Trash2, Wrench } from 'lucide-react'
import { toast } from 'sonner'

import { AsyncState } from '@/components/feedback/async-state'
import { TableSkeleton } from '@/components/feedback/skeletons'
import { PageHeader } from '@/components/layout/page-header'
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
import { usePagedSearch } from '@/hooks/usePagedSearch'
import { usePermissions } from '@/hooks/usePermissions'
import { useRemoteData } from '@/hooks/useRemoteData'
import { ApiError } from '@/services/api'
import {
  type Category,
  CATEGORY_KINDS,
  type CategoryKind,
  type CategoryKindCounts,
  categoryKindLabel,
  createCategory,
  deleteCategory,
  isCategoryKind,
  listCategories,
  updateCategory,
} from '@/services/categories'

import { DataPanel, RowActions } from './components/DataPanel'
import { STAT_GRID_CLASS, StatCard } from './components/StatCard'
import { TablePager } from './components/TablePager'
import { ellipsis, PAGE_SIZE, pageCount } from './lib/text'

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
  useDocumentTitle('Manage categories')
  const { isAdmin } = usePermissions()
  const { query, setQuery, debouncedQuery, page, setPage } = usePagedSearch()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM)
  const [parents, setParents] = useState<Category[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

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
        if (!cancelled) setParents(result.data.filter((row) => row.parentId === null && row.id !== editing?.id))
      })
      .catch((error) => {
        if (!cancelled) toast.error(error instanceof ApiError ? error.message : 'Could not load parent categories')
      })
    return () => {
      cancelled = true
    }
  }, [dialogOpen, editing?.id, form.kind])

  const parentOptions = useMemo(() => {
    if (!editing?.parentId || editing.kind !== form.kind) return parents
    if (parents.some((row) => row.id === editing.parentId)) return parents
    return [
      {
        ...editing,
        id: editing.parentId,
        name: editing.parentName ?? 'Parent',
        parentId: null,
        parentName: null,
      },
      ...parents,
    ]
  }, [editing, form.kind, parents])

  const deleteBlocked = pendingDelete
    ? pendingDelete.childCount > 0 || pendingDelete.listingCount > 0
    : false

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(row: Category) {
    setEditing(row)
    setForm(formFromCategory(row))
    setDialogOpen(true)
  }

  async function save() {
    const name = form.name.trim()
    if (!name) {
      toast.error('Name is required')
      return
    }
    const payload = {
      name,
      kind: form.kind,
      parentId: form.parentId || null,
      isActive: form.isActive,
    }
    setIsSaving(true)
    try {
      if (editing) await updateCategory(editing.id, payload)
      else await createCategory(payload)
      setDialogOpen(false)
      toast.message(editing ? 'Category updated' : 'Category created')
      if (!editing) setPage(1)
      await remote.refetch()
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not save category')
    } finally {
      setIsSaving(false)
    }
  }

  async function confirmDelete() {
    if (!pendingDelete || deleteBlocked) return
    const id = pendingDelete.id
    setBusyId(id)
    try {
      await deleteCategory(id)
      toast.message('Category removed')
      setPendingDelete(null)
      await remote.refetch()
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not remove category')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        className="mb-0"
        title="Manage categories"
        description={
          isAdmin
            ? 'Platform categories. Admin-managed, available globally.'
            : 'Platform categories used across the directory.'
        }
        actions={
          isAdmin ? (
            <Button type="button" onClick={openCreate}>
              Add category
            </Button>
          ) : undefined
        }
      />

      <div className={STAT_GRID_CLASS}>
        <StatCard icon={Box} label="Material" value={counts.MATERIAL} />
        <StatCard icon={Wrench} label="Equipment" value={counts.EQUIPMENT} />
        <StatCard icon={Briefcase} label="Service" value={counts.SERVICE} />
        <StatCard icon={HardHat} label="Worker" value={counts.WORKER} />
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
              placeholder="Filter categories…"
              aria-label="Filter categories"
              className="max-w-sm"
            />
          }
          footer={<TablePager page={page} totalPages={totalPages} total={total} onPageChange={setPage} />}
        >
          <Table startIndex={(page - 1) * PAGE_SIZE}>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin ? <TableHead className="text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 5 : 4} className="text-muted-foreground">
                    No categories match.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell title={row.name} className="max-w-56 truncate">
                      {ellipsis(row.name, 36)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{categoryKindLabel(row.kind)}</Badge>
                    </TableCell>
                    <TableCell className="max-w-40 truncate" title={row.parentName ?? undefined}>
                      {ellipsis(row.parentName, 24)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.isActive ? 'default' : 'outline'}>
                        {row.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    {isAdmin ? (
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
            <DialogTitle>{editing ? 'Edit category' : 'Add category'}</DialogTitle>
            <DialogDescription>
              Platform catalog. Nest one level under a top-level category of the same kind.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="category-name">Name</Label>
              <Input
                id="category-name"
                value={form.name}
                maxLength={80}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="category-kind">Kind</Label>
              <Select
                items={CATEGORY_KINDS.map((kind) => ({ value: kind, label: categoryKindLabel(kind) }))}
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
                      {categoryKindLabel(kind)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="category-parent">Parent</Label>
              <Select
                items={[
                  { value: 'none', label: 'No parent (top level)' },
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
                  <SelectValue placeholder="No parent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No parent (top level)</SelectItem>
                  {parentOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="category-active">Active</Label>
              <Switch
                id="category-active"
                checked={form.isActive}
                onCheckedChange={(checked) => setForm((current) => ({ ...current, isActive: checked }))}
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
            <AlertDialogTitle>Remove category</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteBlocked
                ? 'This category still has subcategories or listings, so it cannot be removed.'
                : `This removes ${pendingDelete?.name ?? 'the category'} from the platform catalog.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={deleteBlocked} onClick={() => void confirmDelete()}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
