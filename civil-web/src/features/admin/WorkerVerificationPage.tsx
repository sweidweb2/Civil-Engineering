import { BadgeCheck, ChevronsRight, Clock, HardHat, ShieldOff, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { AsyncState } from '@/components/feedback/async-state'
import { TableSkeleton } from '@/components/feedback/skeletons'
import { PageHeader } from '@/components/layout/page-header'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { loadMock } from '@/hooks/loadMock'
import { useRemoteData } from '@/hooks/useRemoteData'

import type { VerificationStatus, WorkerVerificationRow } from './admin.types'
import { DataPanel, RowActions } from './components/DataPanel'
import { STAT_GRID_CLASS, StatCard } from './components/StatCard'
import { TablePager } from './components/TablePager'
import { UserAttributeCells, VerificationBadge, WORKER_TABLE_HEADERS } from './components/UserCells'
import { PAGE_SIZE, pageCount, paginate } from './lib/text'
import { matchesUserQuery, MOCK_WORKER_VERIFICATIONS } from './mock-data'

const NEXT_STATUS: Record<VerificationStatus, VerificationStatus> = {
  unverified: 'requested',
  requested: 'verified',
  verified: 'unverified',
}

export function WorkerVerificationPage() {
  useDocumentTitle('Worker verification')
  const load = useCallback(() => loadMock(MOCK_WORKER_VERIFICATIONS), [])
  const remote = useRemoteData(load)
  const seed = remote.status === 'success' ? remote.data : null
  const [rows, setRows] = useState<WorkerVerificationRow[]>([])
  useEffect(() => {
    if (seed) setRows(seed)
  }, [seed])
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ email: '', firstName: '', lastName: '', phone: '' })

  const filtered = useMemo(() => rows.filter((row) => matchesUserQuery(row, query)), [rows, query])
  const totalPages = pageCount(filtered.length)
  const safePage = Math.min(page, totalPages)
  const visible = paginate(filtered, safePage)

  function cycleStatus(id: string) {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== id) return row
        const verification = NEXT_STATUS[row.verification]
        return { ...row, verification, isVerified: verification === 'verified' }
      }),
    )
    toast.message('Verification updated (UI only)')
  }

  function removeRow(id: string) {
    setRows((current) => current.filter((row) => row.id !== id))
    toast.message('Worker removed from this list (UI only)')
  }

  function addRow() {
    const email = form.email.trim()
    if (!email) {
      toast.error('Email is required')
      return
    }
    const now = new Date().toISOString()
    const id = `usr_w_${Date.now()}`
    setRows((current) => [
      {
        id,
        email,
        role: 'WORKER',
        status: 'ACTIVE',
        isVerified: false,
        createdAt: now,
        updatedAt: now,
        verification: 'requested',
        profile: {
          firstName: form.firstName.trim() || null,
          lastName: form.lastName.trim() || null,
          displayName: [form.firstName.trim(), form.lastName.trim()].filter(Boolean).join(' ') || null,
          phone: form.phone.trim() || null,
          avatarUrl: null,
          createdAt: now,
          updatedAt: now,
        },
      },
      ...current,
    ])
    setForm({ email: '', firstName: '', lastName: '', phone: '' })
    setDialogOpen(false)
    toast.message('Verification request added (UI only)')
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        className="mb-0"
        title="Worker verification"
        description="Unverified workers stay off the public marketplace. Flow: Unverified → Requested → Verified."
        actions={
          <Button type="button" onClick={() => setDialogOpen(true)}>
            Add request
          </Button>
        }
      />

      <div className={STAT_GRID_CLASS}>
        <StatCard icon={HardHat} label="Workers" value={rows.length} />
        <StatCard
          icon={ShieldOff}
          label="Unverified"
          value={rows.filter((r) => r.verification === 'unverified').length}
        />
        <StatCard
          icon={Clock}
          label="Requested"
          value={rows.filter((r) => r.verification === 'requested').length}
        />
        <StatCard
          icon={BadgeCheck}
          label="Verified"
          value={rows.filter((r) => r.verification === 'verified').length}
        />
      </div>

      <AsyncState
        isLoading={remote.isLoading}
        error={remote.isError ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
        loadingFallback={<TableSkeleton columns={WORKER_TABLE_HEADERS.length + 2} />}
      >
        <DataPanel
          toolbar={
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
              placeholder="Filter workers…"
              aria-label="Filter workers"
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
              {WORKER_TABLE_HEADERS.map((header) => (
                <TableHead key={header}>{header}</TableHead>
              ))}
              <TableHead>Verification</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={WORKER_TABLE_HEADERS.length + 2} className="text-muted-foreground">
                  No workers match.
                </TableCell>
              </TableRow>
            ) : (
              visible.map((row) => (
                <TableRow key={row.id}>
                  <UserAttributeCells row={row} showRoleStatus={false} />
                  <TableCell>
                    <VerificationBadge status={row.verification} />
                  </TableCell>
                  <TableCell className="text-right">
                    <RowActions>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="outline"
                        aria-label={`Advance ${row.email}`}
                        onClick={() => cycleStatus(row.id)}
                      >
                        <ChevronsRight />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="destructive"
                        aria-label={`Delete ${row.email}`}
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
      </AsyncState>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add verification request</DialogTitle>
            <DialogDescription>Creates a local worker row. Not saved to the API.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="worker-email">Email</Label>
              <Input
                id="worker-email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="worker-first">First name</Label>
              <Input
                id="worker-first"
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="worker-last">Last name</Label>
              <Input
                id="worker-last"
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="worker-phone">Phone</Label>
              <Input
                id="worker-phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={addRow}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
