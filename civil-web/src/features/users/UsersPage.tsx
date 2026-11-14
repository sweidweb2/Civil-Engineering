import { useCallback, useMemo, useState } from 'react'
import {
  Briefcase,
  ChevronDown,
  Eye,
  MoreHorizontal,
  Plus,
  Trash2,
  UserCheck,
  Users,
  UserX,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { AsyncState } from '@/components/feedback/async-state'
import { TableSkeleton } from '@/components/feedback/skeletons'
import { DataPanel, PageHeader, RowActions, STAT_GRID_CLASS, TablePager } from '@/components/layout'
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
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { usePagedQuery } from '@/hooks/usePagedQuery'
import { useRemoteData } from '@/hooks/useRemoteData'
import { portalBaseFromPath } from '@/lib/homePath'
import { cn } from '@/lib/utils'
import { ApiError } from '@/services/api'
import { toastApiError } from '@/services/toast'
import {
  createUser as createUserApi,
  deactivateUser,
  listUsers,
  updateUser,
  type UserDirectoryCounts,
} from '@/services/users'

import {
  monthOverMonth,
  ProjectMetricCard,
  ProjectMetricCardSkeleton,
} from './components/ProjectMetricCard'
import { RoleBarChart } from './components/RoleBarChart'
import { USER_TABLE_HEADERS, UserAttributeCells } from './components/UserCells'
import { UserFormDialog } from './components/UserFormDialog'
import { PAGE_SIZE, pageCount } from './lib/text'
import { readUsersPageLayout, writeUsersPageLayout } from './lib/users-layout'
import { toAdminUserRow, type UserFormValues } from './users.rows'

const EMPTY_COUNTS: UserDirectoryCounts = {
  accounts: 0,
  active: 0,
  inactive: 0,
  managers: 0,
  createdThisMonth: 0,
  createdLastMonth: 0,
  activeCreatedThisMonth: 0,
  activeCreatedLastMonth: 0,
  inactiveCreatedThisMonth: 0,
  inactiveCreatedLastMonth: 0,
  managersCreatedThisMonth: 0,
  managersCreatedLastMonth: 0,
  roles: { SUPER: 0, ADMIN: 0, MANAGER: 0, PROVIDER: 0, WORKER: 0, CLIENT: 0 },
}

export function UsersPage() {
  const { t } = useTranslation(['admin', 'common'])
  useDocumentTitle(t('admin:users.documentTitle'))
  const location = useLocation()
  const navigate = useNavigate()
  const usersPath = `${portalBaseFromPath(location.pathname)}/users`
  const { query, setQuery, debouncedQuery, page, setPage, resetSearch } = usePagedQuery()
  const [chartsOpen, setChartsOpen] = useState(true)
  const [showUsage, setShowUsage] = useState(() => readUsersPageLayout().showUsage)
  const [layoutOpen, setLayoutOpen] = useState(false)
  const [draftShowUsage, setDraftShowUsage] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [pendingDeactivate, setPendingDeactivate] = useState<{ id: string; email: string } | null>(
    null,
  )
  const [isDeactivating, setIsDeactivating] = useState(false)

  const load = useCallback(
    () => listUsers(page, PAGE_SIZE, debouncedQuery || undefined),
    [debouncedQuery, page],
  )
  const remote = useRemoteData(load, { queryKey: ['users', 'list', page, debouncedQuery] })

  const rows = useMemo(
    () => (remote.status === 'success' ? remote.data.data.map(toAdminUserRow) : []),
    [remote],
  )
  const total = remote.status === 'success' ? remote.data.meta.total : 0
  const totalPages = remote.status === 'success' ? remote.data.meta.totalPages : pageCount(total)
  const counts = remote.status === 'success' ? remote.data.meta.counts : EMPTY_COUNTS

  async function onToggleStatus(id: string) {
    if (remote.status !== 'success') return
    const current = remote.data.data.find((item) => item.id === id)
    if (!current) return
    const nextStatus = current.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    try {
      await updateUser(id, { status: nextStatus })
      toast.success(t('admin:users.statusUpdated'))
      await remote.refetch()
    } catch (error) {
      toastApiError(error, t('admin:users.couldNotUpdateStatus'))
    }
  }

  async function onDeactivateUser(id: string) {
    setIsDeactivating(true)
    try {
      await deactivateUser(id)
      toast.success(t('admin:users.userDeactivated'))
      setPendingDeactivate(null)
      await remote.refetch()
    } catch (error) {
      toastApiError(error, t('admin:users.couldNotDeactivate'))
    } finally {
      setIsDeactivating(false)
    }
  }

  async function onCreateUser(values: UserFormValues): Promise<string | null> {
    const email = values.email.trim().toLowerCase()
    if (!email) return t('admin:users.emailRequired')
    if (values.password.length < 8) return t('admin:users.passwordMin')
    try {
      const created = await createUserApi({
        email,
        password: values.password,
        role: values.role,
        firstName: values.firstName.trim() || undefined,
        lastName: values.lastName.trim() || undefined,
        displayName: values.displayName.trim() || undefined,
        phone: values.phone.trim() || undefined,
      })
      if (values.status === 'INACTIVE') {
        await deactivateUser(created.data.id)
      }
      const staysOnFirstPage = page === 1 && debouncedQuery === '' && query === ''
      resetSearch()
      if (staysOnFirstPage) await remote.refetch()
      return null
    } catch (error) {
      if (error instanceof ApiError) return error.message
      return t('admin:users.couldNotCreate')
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        className="mb-0"
        title={t('admin:users.title')}
        description={t('admin:users.description')}
        actions={
          <div className="flex items-center gap-2">
            <Button type="button" onClick={() => setCreateOpen(true)}>
              <Plus />
              {t('admin:users.create')}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={t('admin:users.pageOptions')}
                className={cn(buttonVariants({ variant: 'outline', size: 'icon-sm' }))}
              >
                <MoreHorizontal />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-40">
                <DropdownMenuItem
                  onClick={() => {
                    setDraftShowUsage(showUsage)
                    setLayoutOpen(true)
                  }}
                >
                  {t('admin:users.manageLayout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      {remote.isLoading ? (
        <div className={STAT_GRID_CLASS}>
          {Array.from({ length: 4 }, (_, index) => (
            <ProjectMetricCardSkeleton key={index} />
          ))}
        </div>
      ) : (
        <div className={STAT_GRID_CLASS}>
          <ProjectMetricCard
            icon={Users}
            label={t('admin:users.metricUsers')}
            value={String(counts.accounts)}
            change={monthOverMonth(counts.createdThisMonth, counts.createdLastMonth)}
          />
          <ProjectMetricCard
            icon={UserCheck}
            label={t('admin:users.metricActive')}
            value={String(counts.active)}
            change={monthOverMonth(counts.activeCreatedThisMonth, counts.activeCreatedLastMonth)}
            barShift={4}
          />
          <ProjectMetricCard
            icon={UserX}
            label={t('admin:users.metricInactive')}
            value={String(counts.inactive)}
            change={monthOverMonth(
              counts.inactiveCreatedThisMonth,
              counts.inactiveCreatedLastMonth,
            )}
            barShift={8}
          />
          <ProjectMetricCard
            icon={Briefcase}
            label={t('admin:users.metricManagers')}
            value={String(counts.managers)}
            change={monthOverMonth(
              counts.managersCreatedThisMonth,
              counts.managersCreatedLastMonth,
            )}
            barShift={12}
          />
        </div>
      )}

      {showUsage ? (
        <Card size="sm" className="min-w-0">
          <CardHeader className="p-0">
            <button
              type="button"
              className="flex w-full items-start justify-between gap-3 px-(--card-spacing) py-(--card-spacing) text-left"
              aria-expanded={chartsOpen}
              aria-controls="users-charts"
              onClick={() => setChartsOpen((open) => !open)}
            >
              <div className="min-w-0 space-y-1">
                <CardTitle>{t('admin:users.usage')}</CardTitle>
                <p className="text-sm text-muted-foreground">{t('admin:users.usageDescription')}</p>
              </div>
              <span className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
                <ChevronDown
                  className={cn('size-3.5 transition-transform', chartsOpen && 'rotate-180')}
                />
                {chartsOpen ? t('common:hide') : t('common:show')}
              </span>
            </button>
          </CardHeader>
          {chartsOpen ? (
            <CardContent id="users-charts">
              <div className="min-w-0">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  {t('admin:users.usersByRole')}
                </p>
                <RoleBarChart counts={counts.roles} />
              </div>
            </CardContent>
          ) : null}
        </Card>
      ) : null}

      <Dialog open={layoutOpen} onOpenChange={setLayoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin:users.manageLayout')}</DialogTitle>
            <DialogDescription>{t('admin:users.manageLayoutDescription')}</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="layout-usage">{t('admin:users.usageGraphs')}</Label>
            <Checkbox
              id="layout-usage"
              checked={draftShowUsage}
              onCheckedChange={setDraftShowUsage}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setLayoutOpen(false)}>
              {t('common:cancel')}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setShowUsage(draftShowUsage)
                writeUsersPageLayout({ showUsage: draftShowUsage })
                setLayoutOpen(false)
                toast.message(t('admin:users.layoutSaved'))
              }}
            >
              {t('common:save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UserFormDialog
        open={createOpen}
        mode="create"
        onOpenChange={setCreateOpen}
        onSave={onCreateUser}
      />

      <AlertDialog
        open={pendingDeactivate !== null}
        onOpenChange={(open) => {
          if (!open && !isDeactivating) setPendingDeactivate(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin:users.deactivateTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin:users.deactivateDescription', { email: pendingDeactivate?.email })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeactivating}>{t('common:cancel')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeactivating || !pendingDeactivate}
              onClick={() => {
                if (pendingDeactivate) void onDeactivateUser(pendingDeactivate.id)
              }}
            >
              {isDeactivating ? t('common:deactivating') : t('common:deactivate')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AsyncState
        isLoading={remote.isLoading}
        error={remote.isError ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
        loadingFallback={<TableSkeleton columns={USER_TABLE_HEADERS.length + 1} />}
      >
        <DataPanel
          toolbar={
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('admin:users.searchPlaceholder')}
              aria-label={t('admin:users.searchAria')}
              className="max-w-sm"
            />
          }
          footer={
            <TablePager
              page={page}
              totalPages={Math.max(1, totalPages)}
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
                <TableHead className="text-end">{t('common:actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={USER_TABLE_HEADERS.length + 1}
                    className="text-muted-foreground"
                  >
                    {t('admin:users.noMatch')}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow
                    key={row.id}
                    clickable
                    onClick={() => navigate(`${usersPath}/${row.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        navigate(`${usersPath}/${row.id}`)
                      }
                    }}
                  >
                    <UserAttributeCells
                      row={row}
                      showAvatar
                      onToggleStatus={(id) => {
                        void onToggleStatus(id)
                      }}
                    />
                    <TableCell className="text-right">
                      <RowActions>
                        <Link
                          to={`${usersPath}/${row.id}`}
                          aria-label={t('admin:users.viewUser', { email: row.email })}
                          className={cn(buttonVariants({ variant: 'outline', size: 'icon-sm' }))}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Eye />
                        </Link>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="destructive"
                          aria-label={t('admin:users.deactivateUser', { email: row.email })}
                          onClick={(event) => {
                            event.stopPropagation()
                            setPendingDeactivate({ id: row.id, email: row.email })
                          }}
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
    </div>
  )
}
