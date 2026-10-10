import { Briefcase, ChevronDown, Eye, MoreHorizontal, Plus, Trash2, UserCheck, Users, UserX } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

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
import { AsyncState } from '@/components/feedback/async-state'
import { TableSkeleton } from '@/components/feedback/skeletons'
import { PageHeader } from '@/components/layout/page-header'
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
  type UserStatus,
} from '@/services/users'

import { DataPanel, RowActions } from './components/DataPanel'
import { UserFormDialog } from './components/UserFormDialog'
import { LoginLineChart } from './components/LoginLineChart'
import { RoleBarChart } from './components/RoleBarChart'
import {
  monthOverMonth,
  ProjectMetricCard,
  ProjectMetricCardSkeleton,
} from './components/ProjectMetricCard'
import { STAT_GRID_CLASS } from './components/StatCard'
import { TablePager } from './components/TablePager'
import { UserAttributeCells, USER_TABLE_HEADERS } from './components/UserCells'
import { PAGE_SIZE, pageCount } from './lib/text'
import { readUsersPageLayout, writeUsersPageLayout } from './lib/users-layout'
import { matchesUserQuery, MOCK_LOGINS_DAILY } from './mock-data'
import { toAdminUserRow, type UserFormValues } from './usersStore'

const EMPTY_COUNTS: UserDirectoryCounts = {
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
}

function createdInMonth(iso: string, offset: number): boolean {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1).getTime()
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1).getTime()
  const created = new Date(iso).getTime()
  return created >= start && created < end
}

function shiftStatusCounts(
  counts: UserDirectoryCounts,
  from: UserStatus,
  to: UserStatus,
  createdAt: string,
): UserDirectoryCounts {
  if (from === to) return counts
  const next = { ...counts }
  const bump = (status: UserStatus, delta: number) => {
    if (status === 'ACTIVE') next.active += delta
    if (status === 'INACTIVE') next.inactive += delta
    if (createdInMonth(createdAt, 0)) {
      if (status === 'ACTIVE') next.activeCreatedThisMonth += delta
      if (status === 'INACTIVE') next.inactiveCreatedThisMonth += delta
    }
    if (createdInMonth(createdAt, -1)) {
      if (status === 'ACTIVE') next.activeCreatedLastMonth += delta
      if (status === 'INACTIVE') next.inactiveCreatedLastMonth += delta
    }
  }
  bump(from, -1)
  bump(to, 1)
  return next
}

export function UsersPage() {
  useDocumentTitle('Users')
  const location = useLocation()
  const navigate = useNavigate()
  const usersPath = `${portalBaseFromPath(location.pathname)}/users`
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [chartsOpen, setChartsOpen] = useState(true)
  const [showUsage, setShowUsage] = useState(() => readUsersPageLayout().showUsage)
  const [layoutOpen, setLayoutOpen] = useState(false)
  const [draftShowUsage, setDraftShowUsage] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [pendingDeactivate, setPendingDeactivate] = useState<{ id: string; email: string } | null>(null)
  const [isDeactivating, setIsDeactivating] = useState(false)

  const load = useCallback(() => listUsers(page, PAGE_SIZE), [page])
  const remote = useRemoteData(load)
  const statusToggleGeneration = useRef(new Map<string, number>())

  const rows = useMemo(
    () => (remote.status === 'success' ? remote.data.data.map(toAdminUserRow) : []),
    [remote],
  )
  const total = remote.status === 'success' ? remote.data.meta.total : 0
  const totalPages = remote.status === 'success' ? remote.data.meta.totalPages : pageCount(total)
  const counts = remote.status === 'success' ? remote.data.meta.counts : EMPTY_COUNTS

  const filtered = useMemo(() => rows.filter((row) => matchesUserQuery(row, query)), [rows, query])

  async function onToggleStatus(id: string) {
    if (remote.status !== 'success') return
    const current = remote.data.data.find((item) => item.id === id)
    if (!current) return
    const nextStatus = current.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    const generation = (statusToggleGeneration.current.get(id) ?? 0) + 1
    statusToggleGeneration.current.set(id, generation)

    remote.mutate((pageData) => ({
      ...pageData,
      data: pageData.data.map((item) => (item.id === id ? { ...item, status: nextStatus } : item)),
      meta: {
        ...pageData.meta,
        counts: shiftStatusCounts(pageData.meta.counts, current.status, nextStatus, current.createdAt),
      },
    }))

    try {
      const result = await updateUser(id, { status: nextStatus })
      if (statusToggleGeneration.current.get(id) !== generation) return
      remote.mutate((pageData) => ({
        ...pageData,
        data: pageData.data.map((item) => (item.id === id ? result.data : item)),
      }))
      toast.success('Status updated')
    } catch (error) {
      if (statusToggleGeneration.current.get(id) !== generation) return
      remote.mutate((pageData) => ({
        ...pageData,
        data: pageData.data.map((item) => (item.id === id ? current : item)),
        meta: {
          ...pageData.meta,
          counts: shiftStatusCounts(pageData.meta.counts, nextStatus, current.status, current.createdAt),
        },
      }))
      toastApiError(error, 'Could not update status')
    }
  }

  async function onDeactivateUser(id: string) {
    setIsDeactivating(true)
    try {
      await deactivateUser(id)
      toast.success('User deactivated')
      setPendingDeactivate(null)
      await remote.refetch()
    } catch (error) {
      toastApiError(error, 'Could not deactivate user')
    } finally {
      setIsDeactivating(false)
    }
  }

  async function onCreateUser(values: UserFormValues): Promise<string | null> {
    const email = values.email.trim().toLowerCase()
    if (!email) return 'Email is required'
    if (values.password.length < 8) return 'Password must be at least 8 characters'
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
      setPage(1)
      await remote.refetch()
      return null
    } catch (error) {
      if (error instanceof ApiError) return error.message
      return 'Could not create user'
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        className="mb-0"
        title="Manage users"
        description="User + profile fields from the API. passwordHash is never shown."
        actions={
          <div className="flex items-center gap-2">
            <Button type="button" onClick={() => setCreateOpen(true)}>
              <Plus />
              Create
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Page options"
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
                  Manage layout
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
            label="Users"
            value={String(total)}
            change={monthOverMonth(counts.createdThisMonth, counts.createdLastMonth)}
          />
          <ProjectMetricCard
            icon={UserCheck}
            label="Active"
            value={String(counts.active)}
            change={monthOverMonth(counts.activeCreatedThisMonth, counts.activeCreatedLastMonth)}
            barShift={4}
          />
          <ProjectMetricCard
            icon={UserX}
            label="Inactive"
            value={String(counts.inactive)}
            change={monthOverMonth(counts.inactiveCreatedThisMonth, counts.inactiveCreatedLastMonth)}
            barShift={8}
          />
          <ProjectMetricCard
            icon={Briefcase}
            label="Project managers"
            value={String(counts.managers)}
            change={monthOverMonth(counts.managersCreatedThisMonth, counts.managersCreatedLastMonth)}
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
                <CardTitle>Usage</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Role mix from this page. Logins chart is placeholder data.
                </p>
              </div>
              <span className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
                <ChevronDown className={cn('size-3.5 transition-transform', chartsOpen && 'rotate-180')} />
                {chartsOpen ? 'Hide' : 'Show'}
              </span>
            </button>
          </CardHeader>
          {chartsOpen ? (
            <CardContent id="users-charts">
              <div className="grid min-w-0 gap-6 lg:grid-cols-2">
                <div className="min-w-0">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Logins per day</p>
                  <LoginLineChart points={MOCK_LOGINS_DAILY} />
                </div>
                <div className="min-w-0">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Users by role</p>
                  <RoleBarChart rows={rows} />
                </div>
              </div>
            </CardContent>
          ) : null}
        </Card>
      ) : null}

      <Dialog open={layoutOpen} onOpenChange={setLayoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage layout</DialogTitle>
            <DialogDescription>Choose which sections appear on this page. Saved on this device.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="layout-usage">Usage graphs</Label>
            <Checkbox
              id="layout-usage"
              checked={draftShowUsage}
              onCheckedChange={setDraftShowUsage}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setLayoutOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                setShowUsage(draftShowUsage)
                writeUsersPageLayout({ showUsage: draftShowUsage })
                setLayoutOpen(false)
                toast.message('Layout saved')
              }}
            >
              Save
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
            <AlertDialogTitle>Deactivate user?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeactivate?.email} will be marked inactive and will not be able to sign in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeactivating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeactivating || !pendingDeactivate}
              onClick={() => {
                if (pendingDeactivate) void onDeactivateUser(pendingDeactivate.id)
              }}
            >
              {isDeactivating ? 'Deactivating...' : 'Deactivate'}
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
              onChange={(e) => {
                setQuery(e.target.value)
              }}
              placeholder="Filter this page…"
              aria-label="Filter users"
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
                  <TableHead key={header}>{header}</TableHead>
                ))}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={USER_TABLE_HEADERS.length + 1} className="text-muted-foreground">
                    No users match.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => (
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
                          aria-label={`View ${row.email}`}
                          className={cn(buttonVariants({ variant: 'outline', size: 'icon-sm' }))}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Eye />
                        </Link>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="destructive"
                          aria-label={`Deactivate ${row.email}`}
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
