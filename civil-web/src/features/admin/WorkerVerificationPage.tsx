import { useCallback, useState } from 'react'
import { BadgeCheck, ChevronsRight, Clock, HardHat, ShieldOff, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { AsyncState } from '@/components/feedback/async-state'
import { TableSkeleton } from '@/components/feedback/skeletons'
import { DataPanel, RowActions, TablePager, ToolbarCard } from '@/components/layout'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePagedQuery } from '@/hooks/usePagedQuery'
import { useRemoteData } from '@/hooks/useRemoteData'
import { ApiError } from '@/services/api'
import { toastApiError } from '@/services/toast'
import {
  type ApiVerificationStatus,
  createVerification,
  deleteVerification,
  listVerifications,
  setVerification,
  type VerificationCounts,
} from '@/services/users'

import type { VerificationStatus, WorkerVerificationRow } from './admin.types'
import { STAT_GRID_CLASS, StatCard } from './components/StatCard'
import { UserAttributeCells, VerificationBadge, WORKER_TABLE_HEADERS } from './components/UserCells'
import { PAGE_SIZE } from './lib/text'
import { toAdminUserRow } from './users.rows'

const NEXT_STATUS: Record<VerificationStatus, ApiVerificationStatus> = {
  unverified: 'REQUESTED',
  requested: 'VERIFIED',
  verified: 'UNVERIFIED',
}

const NEXT_LABEL: Record<VerificationStatus, string> = {
  unverified: 'Mark requested',
  requested: 'Mark verified',
  verified: 'Mark unverified',
}

const STATUS_TABS: Array<{ value: 'all' | ApiVerificationStatus; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'UNVERIFIED', label: 'Unverified' },
  { value: 'REQUESTED', label: 'Requested' },
  { value: 'VERIFIED', label: 'Verified' },
]

const EMPTY_COUNTS: VerificationCounts = { workers: 0, unverified: 0, requested: 0, verified: 0 }

const EMPTY_FORM = { email: '', password: '', firstName: '', lastName: '', phone: '' }

function toUiStatus(status: ApiVerificationStatus): VerificationStatus {
  if (status === 'REQUESTED') return 'requested'
  if (status === 'VERIFIED') return 'verified'
  return 'unverified'
}

function toWorkerRow(user: Parameters<typeof toAdminUserRow>[0]): WorkerVerificationRow {
  return {
    ...toAdminUserRow(user),
    verification: toUiStatus(user.verificationStatus),
  }
}

export function VerificationQueue() {
  const { query, setQuery, debouncedQuery, page, setPage, resetSearch } = usePagedQuery()
  const [status, setStatus] = useState<(typeof STATUS_TABS)[number]['value']>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<WorkerVerificationRow | null>(null)

  const load = useCallback(
    () =>
      listVerifications({
        page,
        limit: PAGE_SIZE,
        q: debouncedQuery || undefined,
        status: status === 'all' ? undefined : status,
      }),
    [debouncedQuery, page, status],
  )
  const remote = useRemoteData(load, { queryKey: ['users', 'verifications', page, debouncedQuery, status] })
  const payload = remote.status === 'success' ? remote.data : null
  const rows = payload ? payload.data.map(toWorkerRow) : []
  const counts = payload?.meta.counts ?? EMPTY_COUNTS
  const total = payload?.meta.total ?? 0
  const totalPages = Math.max(1, payload?.meta.totalPages ?? 1)

  async function runRowAction(id: string, action: () => Promise<unknown>, success: string) {
    setBusyId(id)
    try {
      await action()
      toast.success(success)
      await remote.refetch()
    } catch (error) {
      toastApiError(error, 'Could not update verification')
    } finally {
      setBusyId(null)
    }
  }

  async function onCreate() {
    const email = form.email.trim().toLowerCase()
    if (!email) {
      toast.error('Email is required')
      return
    }
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setIsSaving(true)
    try {
      await createVerification({
        email,
        password: form.password,
        firstName: form.firstName.trim() || undefined,
        lastName: form.lastName.trim() || undefined,
        phone: form.phone.trim() || undefined,
      })
      setForm(EMPTY_FORM)
      setDialogOpen(false)
      const staysOnFirstPage = page === 1 && debouncedQuery === '' && query === ''
      resetSearch()
      toast.success('Verification request created')
      if (staysOnFirstPage) await remote.refetch()
    } catch (error) {
      if (error instanceof ApiError) toast.error(error.message)
      else toast.error('Could not create verification request')
    } finally {
      setIsSaving(false)
    }
  }

  async function onDelete() {
    if (!deleteTarget) return
    const id = deleteTarget.id
    setDeleteTarget(null)
    await runRowAction(id, () => deleteVerification(id), 'Worker deleted')
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className={STAT_GRID_CLASS}>
        <StatCard icon={HardHat} label="Workers" value={counts.workers} />
        <StatCard icon={ShieldOff} label="Unverified" value={counts.unverified} />
        <StatCard icon={Clock} label="Requested" value={counts.requested} />
        <StatCard icon={BadgeCheck} label="Verified" value={counts.verified} />
      </div>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this worker?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.email} will be removed. Linked records block deletion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void onDelete()}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ToolbarCard>
        <Tabs
          value={status}
          onValueChange={(value) => {
            const next = STATUS_TABS.find((item) => item.value === value)
            if (!next) return
            setStatus(next.value)
            setPage(1)
          }}
        >
          <TabsList>
            {STATUS_TABS.map((item) => (
              <TabsTrigger key={item.value} value={item.value}>
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search workers…"
          aria-label="Search workers"
          className="max-w-sm"
        />
        <Button type="button" className="ms-auto" onClick={() => setDialogOpen(true)}>
          Add request
        </Button>
      </ToolbarCard>

      <AsyncState
        isLoading={remote.isLoading}
        error={remote.isError ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
        loadingFallback={<TableSkeleton columns={WORKER_TABLE_HEADERS.length + 2} />}
      >
        <DataPanel
          footer={
            <TablePager page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
          }
        >
          <Table startIndex={(page - 1) * PAGE_SIZE} indexVariant="plain">
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
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={WORKER_TABLE_HEADERS.length + 2} className="text-muted-foreground">
                    No workers match.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <UserAttributeCells row={row} showRoleStatus={false} showAvatar />
                    <TableCell>
                      <VerificationBadge status={row.verification} />
                    </TableCell>
                    <TableCell className="text-right">
                      <RowActions>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="outline"
                          aria-label={`${NEXT_LABEL[row.verification]} for ${row.email}`}
                          disabled={busyId === row.id}
                          onClick={() =>
                            void runRowAction(
                              row.id,
                              () => setVerification(row.id, NEXT_STATUS[row.verification]),
                              'Verification updated',
                            )
                          }
                        >
                          <ChevronsRight />
                        </Button>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="destructive"
                          aria-label={`Delete ${row.email}`}
                          disabled={busyId === row.id}
                          onClick={() => setDeleteTarget(row)}
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

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (open) setForm(EMPTY_FORM)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add verification request</DialogTitle>
            <DialogDescription>
              Creates a pending worker with verification requested. They cannot sign in until approved, and they stay
              off the marketplace until verified.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="worker-email">Email</Label>
              <Input
                id="worker-email"
                type="email"
                maxLength={254}
                placeholder="name@example.com"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="worker-password">Password</Label>
              <Input
                id="worker-password"
                type="password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="worker-first">First name</Label>
              <Input
                id="worker-first"
                maxLength={100}
                placeholder="First name"
                value={form.firstName}
                onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="worker-last">Last name</Label>
              <Input
                id="worker-last"
                maxLength={100}
                placeholder="Last name"
                value={form.lastName}
                onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="worker-phone">Phone</Label>
              <Input
                id="worker-phone"
                maxLength={20}
                placeholder="+961 70 000 000"
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void onCreate()} disabled={isSaving}>
              {isSaving ? 'Creating…' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
