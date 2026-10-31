import { useCallback, useMemo, useState } from 'react'
import { BadgeCheck, ChevronsRight, Clock, HardHat, ShieldOff, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation(['admin', 'common', 'validation'])
  const { query, setQuery, debouncedQuery, page, setPage, resetSearch } = usePagedQuery()
  const statusTabs = useMemo(
    () =>
      [
        { value: 'all' as const, label: t('admin:verification.tabs.all') },
        { value: 'UNVERIFIED' as const, label: t('admin:verification.tabs.UNVERIFIED') },
        { value: 'REQUESTED' as const, label: t('admin:verification.tabs.REQUESTED') },
        { value: 'VERIFIED' as const, label: t('admin:verification.tabs.VERIFIED') },
      ] as const,
    [t],
  )
  const [status, setStatus] = useState<(typeof statusTabs)[number]['value']>('all')
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
  const remote = useRemoteData(load, {
    queryKey: ['users', 'verifications', page, debouncedQuery, status],
  })
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
      toastApiError(error, t('admin:verification.couldNotUpdate'))
    } finally {
      setBusyId(null)
    }
  }

  async function onCreate() {
    const email = form.email.trim().toLowerCase()
    if (!email) {
      toast.error(t('admin:verification.emailRequired'))
      return
    }
    if (form.password.length < 8) {
      toast.error(t('validation:passwordMin'))
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
      toast.success(t('admin:verification.created'))
      if (staysOnFirstPage) await remote.refetch()
    } catch (error) {
      if (error instanceof ApiError) toast.error(error.message)
      else toast.error(t('admin:verification.couldNotCreate'))
    } finally {
      setIsSaving(false)
    }
  }

  async function onDelete() {
    if (!deleteTarget) return
    const id = deleteTarget.id
    setDeleteTarget(null)
    await runRowAction(id, () => deleteVerification(id), t('admin:verification.deleted'))
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className={STAT_GRID_CLASS}>
        <StatCard
          icon={HardHat}
          label={t('admin:verification.metricWorkers')}
          value={counts.workers}
        />
        <StatCard
          icon={ShieldOff}
          label={t('admin:verification.metricUnverified')}
          value={counts.unverified}
        />
        <StatCard
          icon={Clock}
          label={t('admin:verification.metricRequested')}
          value={counts.requested}
        />
        <StatCard
          icon={BadgeCheck}
          label={t('admin:verification.metricVerified')}
          value={counts.verified}
        />
      </div>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin:verification.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin:verification.deleteDescription', { email: deleteTarget?.email ?? '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void onDelete()}>
              {t('common:delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ToolbarCard>
        <Tabs
          value={status}
          onValueChange={(value) => {
            const next = statusTabs.find((item) => item.value === value)
            if (!next) return
            setStatus(next.value)
            setPage(1)
          }}
        >
          <TabsList>
            {statusTabs.map((item) => (
              <TabsTrigger key={item.value} value={item.value}>
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('admin:verification.searchPlaceholder')}
          aria-label={t('admin:verification.searchAria')}
          className="max-w-sm"
        />
        <Button type="button" className="ms-auto" onClick={() => setDialogOpen(true)}>
          {t('admin:verification.addRequest')}
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
                  <TableHead key={header}>{t(`admin:users.headers.${header}`)}</TableHead>
                ))}
                <TableHead>{t('admin:verification.headerVerification')}</TableHead>
                <TableHead className="text-right">{t('common:actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={WORKER_TABLE_HEADERS.length + 2}
                    className="text-muted-foreground"
                  >
                    {t('admin:verification.noMatch')}
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
                          aria-label={t('admin:verification.nextAria', {
                            action: t(`admin:verification.next.${row.verification}`),
                            email: row.email,
                          })}
                          disabled={busyId === row.id}
                          onClick={() =>
                            void runRowAction(
                              row.id,
                              () => setVerification(row.id, NEXT_STATUS[row.verification]),
                              t('admin:verification.updated'),
                            )
                          }
                        >
                          <ChevronsRight />
                        </Button>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="destructive"
                          aria-label={t('admin:verification.deleteAria', { email: row.email })}
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
            <DialogTitle>{t('admin:verification.form.title')}</DialogTitle>
            <DialogDescription>{t('admin:verification.form.description')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="worker-email">{t('admin:verification.form.email')}</Label>
              <Input
                id="worker-email"
                type="email"
                maxLength={254}
                placeholder={t('admin:verification.form.emailPlaceholder')}
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="worker-password">{t('admin:verification.form.password')}</Label>
              <Input
                id="worker-password"
                type="password"
                autoComplete="new-password"
                placeholder={t('admin:verification.form.passwordPlaceholder')}
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({ ...current, password: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="worker-first">{t('admin:verification.form.firstName')}</Label>
              <Input
                id="worker-first"
                maxLength={100}
                placeholder={t('admin:verification.form.firstName')}
                value={form.firstName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, firstName: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="worker-last">{t('admin:verification.form.lastName')}</Label>
              <Input
                id="worker-last"
                maxLength={100}
                placeholder={t('admin:verification.form.lastName')}
                value={form.lastName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, lastName: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="worker-phone">{t('admin:verification.form.phone')}</Label>
              <Input
                id="worker-phone"
                maxLength={20}
                placeholder={t('admin:verification.form.phonePlaceholder')}
                value={form.phone}
                onChange={(event) =>
                  setForm((current) => ({ ...current, phone: event.target.value }))
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
            <Button type="button" onClick={() => void onCreate()} disabled={isSaving}>
              {isSaving ? t('common:creating') : t('common:add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
