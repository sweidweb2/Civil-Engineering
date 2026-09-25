import { Box, FolderTree, HardHat, Pencil, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/layout/page-header'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

import type { CategoryKind, PlatformCategory } from './admin.types'
import { DataPanel, RowActions } from './components/DataPanel'
import { STAT_GRID_CLASS, StatCard } from './components/StatCard'
import { TablePager } from './components/TablePager'
import { ellipsis, PAGE_SIZE, pageCount, paginate } from './lib/text'
import { MOCK_CATEGORIES } from './mock-data'

type CategoryForm = {
  name: string
  kind: CategoryKind
}

const EMPTY_FORM: CategoryForm = { name: '', kind: 'material' }

export function ManageCategoriesPage() {
  useDocumentTitle('Manage categories')
  const [rows, setRows] = useState<PlatformCategory[]>(MOCK_CATEGORIES)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<PlatformCategory | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) => `${row.name} ${row.kind}`.toLowerCase().includes(q))
  }, [rows, query])

  const totalPages = pageCount(filtered.length)
  const safePage = Math.min(page, totalPages)
  const visible = paginate(filtered, safePage)

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(row: PlatformCategory) {
    setEditing(row)
    setForm({ name: row.name, kind: row.kind })
    setDialogOpen(true)
  }

  function save() {
    const name = form.name.trim()
    if (!name) {
      toast.error('Name is required')
      return
    }

    if (editing) {
      setRows((current) =>
        current.map((row) => (row.id === editing.id ? { ...row, name, kind: form.kind } : row)),
      )
      toast.message('Category updated (UI only)')
    } else {
      setRows((current) => [{ id: `cat_${Date.now()}`, name, kind: form.kind }, ...current])
      toast.message('Category created (UI only)')
    }

    setDialogOpen(false)
  }

  function removeRow(id: string) {
    setRows((current) => current.filter((row) => row.id !== id))
    toast.message('Category deleted (UI only)')
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        className="mb-0"
        title="Manage categories"
        description="Platform categories. Admin-managed, available globally."
        actions={
          <Button type="button" onClick={openCreate}>
            Add category
          </Button>
        }
      />

      <div className={STAT_GRID_CLASS}>
        <StatCard icon={FolderTree} label="Categories" value={rows.length} />
        <StatCard icon={Box} label="Material" value={rows.filter((r) => r.kind === 'material').length} />
        <StatCard icon={HardHat} label="Worker" value={rows.filter((r) => r.kind === 'worker').length} />
      </div>

      <DataPanel
        toolbar={
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
            placeholder="Filter categories…"
            aria-label="Filter categories"
            className="max-w-sm"
          />
        }
        footer={
          <TablePager page={safePage} totalPages={totalPages} total={filtered.length} onPageChange={setPage} />
        }
      >
        <Table startIndex={(safePage - 1) * PAGE_SIZE}>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Kind</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground">
                  No categories match.
                </TableCell>
              </TableRow>
            ) : (
              visible.map((row) => (
                <TableRow key={row.id}>
                  <TableCell title={row.name} className="max-w-56 truncate">
                    {ellipsis(row.name, 36)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{row.kind}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <RowActions>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="outline"
                        aria-label={`Edit ${row.name}`}
                        onClick={() => openEdit(row)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="destructive"
                        aria-label={`Delete ${row.name}`}
                        onClick={() => removeRow(row.id)}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit category' : 'Add category'}</DialogTitle>
            <DialogDescription>UI only. Not persisted.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="category-name">Name</Label>
              <Input
                id="category-name"
                value={form.name}
                maxLength={40}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="category-kind">Kind</Label>
              <Select
                value={form.kind}
                onValueChange={(value) => {
                  if (value === 'material' || value === 'worker') {
                    setForm((f) => ({ ...f, kind: value }))
                  }
                }}
              >
                <SelectTrigger id="category-kind" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="material">Material</SelectItem>
                  <SelectItem value="worker">Worker</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={save}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
