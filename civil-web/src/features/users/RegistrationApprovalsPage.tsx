import { useCallback, useMemo, useState } from 'react'
import { Clock, Plus, Store, Trash2, UserCheck, UserPlus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { AsyncState } from '@/components/feedback/async-state'
import { TableSkeleton } from '@/components/feedback/skeletons'
import {
  DataPanel,
  RowActions,
  STAT_GRID_CLASS,
  StatCard,
  TablePager,
  ToolbarCard,
} from '@/components/layout'
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
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePagedQuery } from '@/hooks/usePagedQuery'
import { useRemoteData } from '@/hooks/useRemoteData'
import { PAGE_SIZE } from '@/lib/text'
import { ApiError } from '@/services/api'
import { toastApiError } from '@/services/toast'
import {
  type ApprovalCounts,
  approveUser,
  createApproval,
  deleteApproval,
  listApprovals,
  unapproveUser,
} from '@/services/users'

import {
  RegistrationFormDialog,
  type RegistrationFormValues,
} from './components/RegistrationFormDialog'
import { USER_TABLE_HEADERS, UserAttributeCells } from './components/UserCells'
import { toAdminUserRow } from './users.rows'
import type { ApprovalStatus, RegistrationRow } from './users.types'

const EMPTY_COUNTS: ApprovalCounts = { pending: 0, approved: 0, providersPending: 0 }

function toRegistrationRow(user: Parameters<typeof toAdminUserRow>[0]): RegistrationRow {
  return {
    ...toAdminUserRow(user),
    approval: user.status === 'PENDING' ? 'pending' : 'approved',
  }
}

export function RegistrationQueue() {
  const { t } = useTranslation(['admin', 'common', 'validation'])
  const { query, setQuery, debouncedQuery, page, setPage, resetSearch } = usePagedQuery()
  const tabs = useMemo(
    () =>
      [
        { value: 'pending' as const, label: t('admin:registrations.pending') },
        { value: 'approved' as const, label: t('admin:registrations.approved') },
      ] as const,
    [t],
  )
  const [tab, setTab] = useState<ApprovalStatus>('pending')
  const [createOpen, setCreateOpen] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<RegistrationRow | null>(null)

  const load = useCallback(
    () =>
      listApprovals({
        approval: tab,
        page,
        limit: PAGE_SIZE,
        q: debouncedQuery || undefined,
      }),
    [debouncedQuery, page, tab],
  )
  const remote = useRemoteData(load, {
    queryKey: ['users', 'approvals', tab, page, debouncedQuery],
  })
  const payload = remote.status === 'success' ? remote.data : null
  const rows = payload ? payload.data.map(toRegistrationRow) : []
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
      toastApiError(error, t('admin:registrations.couldNotUpdate'))
    } finally {
      setBusyId(null)
    }
  }

  async function onCreate(values: RegistrationFormValues): Promise<string | null> {
    const email = values.email.trim().toLowerCase()
    if (!email) return t('admin:registrations.emailRequired')
    if (values.password.length < 8) return t('validation:passwordMin')
    try {
      await createApproval({
        email,
        password: values.password,
        role: values.role,
        firstName: values.firstName.trim() || undefined,
        lastName: values.lastName.trim() || undefined,
        displayName: values.displayName.trim() || undefined,
        phone: values.phone.trim() || undefined,
      })
      const staysOnPendingList =
        tab === 'pending' && page === 1 && debouncedQuery === '' && query === ''
      setTab('pending')
      resetSearch()
      if (staysOnPendingList) await remote.refetch()
      return null
    } catch (error) {
      if (error instanceof ApiError) return error.message
      return t('admin:registrations.couldNotCreate')
    }
  }

  async function onDelete() {
    if (!deleteTarget) return
    const id = deleteTarget.id
    setDeleteTarget(null)
    await runRowAction(id, () => deleteApproval(id), t('admin:registrations.deleted'))
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className={STAT_GRID_CLASS}>
        <StatCard
          icon={UserPlus}
          label={t('admin:registrations.metricPending')}
          value={counts.pending + counts.approved}
        />
        <StatCard icon={Clock} label={t('admin:registrations.pending')} value={counts.pending} />
        <StatCard
          icon={UserCheck}
          label={t('admin:registrations.approved')}
          value={counts.approved}
        />
        <StatCard
          icon={Store}
          label={t('admin:registrations.metricProvidersPending')}
          value={counts.providersPending}
        />
      </div>

      <RegistrationFormDialog open={createOpen} onOpenChange={setCreateOpen} onSave={onCreate} />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin:registrations.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin:registrations.deleteDescription', { email: deleteTarget?.email ?? '' })}
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

      <Tabs
        value={tab}
        onValueChange={(value) => {
          if (value === 'pending' || value === 'approved') {
            setTab(value)
            setPage(1)
          }
        }}
        className="min-w-0 gap-3"
      >
        <ToolbarCard>
          <TabsList>
            {tabs.map((item) => (
              <TabsTrigger key={item.value} value={item.value}>
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('admin:registrations.searchPlaceholder')}
            aria-label={t('admin:registrations.searchAria')}
            className="max-w-sm"
          />
          <Button type="button" className="ms-auto" onClick={() => setCreateOpen(true)}>
            <Plus />
            {t('admin:registrations.create')}
          </Button>
        </ToolbarCard>

        <TabsContent value={tab}>
          <AsyncState
            isLoading={remote.isLoading}
            error={remote.isError ? remote.error : undefined}
            onRetry={() => void remote.refetch()}
            loadingFallback={<TableSkeleton columns={USER_TABLE_HEADERS.length + 1} />}
          >
            <DataPanel
              footer={
                <TablePager
                  page={page}
                  totalPages={totalPages}
                  total={total}
                  onPageChange={setPage}
                />
              }
            >
              <Table startIndex={(page - 1) * PAGE_SIZE} indexVariant="plain">
                <TableHeader>
                  <TableRow>
                    {USER_TABLE_HEADERS.map((header) => (
                      <TableHead key={header}>{t(`admin:users.headers.${header}`)}</TableHead>
                    ))}
                    <TableHead className="text-right">{t('common:actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={USER_TABLE_HEADERS.length + 1}
                        className="text-muted-foreground"
                      >
                        {tab === 'pending'
                          ? t('admin:registrations.emptyPending')
                          : t('admin:registrations.emptyApproved')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => (
                      <TableRow key={row.id}>
                        <UserAttributeCells row={row} showAvatar />
                        <TableCell className="text-right">
                          <RowActions>
                            {tab === 'pending' ? (
                              <Button
                                type="button"
                                size="sm"
                                disabled={busyId === row.id}
                                onClick={() =>
                                  void runRowAction(
                                    row.id,
                                    () => approveUser(row.id),
                                    t('admin:registrations.approvedToast'),
                                  )
                                }
                              >
                                {t('admin:registrations.approve')}
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={busyId === row.id}
                                onClick={() =>
                                  void runRowAction(
                                    row.id,
                                    () => unapproveUser(row.id),
                                    t('admin:registrations.unapprovedToast'),
                                  )
                                }
                              >
                                {t('admin:registrations.unapprove')}
                              </Button>
                            )}
                            {tab === 'pending' ? (
                              <Button
                                type="button"
                                size="icon-sm"
                                variant="destructive"
                                aria-label={t('admin:registrations.deleteAria', {
                                  email: row.email,
                                })}
                                disabled={busyId === row.id}
                                onClick={() => setDeleteTarget(row)}
                              >
                                <Trash2 />
                              </Button>
                            ) : null}
                          </RowActions>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </DataPanel>
          </AsyncState>
        </TabsContent>
      </Tabs>
    </div>
  )
}
