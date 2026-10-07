import { Briefcase, ChevronDown, Eye, MoreHorizontal, Plus, Trash2, UserCheck, Users, UserX } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

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
} from '@/services/users'

import { DataPanel, RowActions } from './components/DataPanel'
import { UserFormDialog } from './components/UserFormDialog'
import { LoginLineChart } from './components/LoginLineChart'
import { RoleBarChart } from './components/RoleBarChart'
import { STAT_GRID_CLASS, StatCard } from './components/StatCard'
import { TablePager } from './components/TablePager'
import { UserAttributeCells, USER_TABLE_HEADERS } from './components/UserCells'
import { PAGE_SIZE, pageCount } from './lib/text'
import { readUsersPageLayout, writeUsersPageLayout } from './lib/users-layout'
import { matchesUserQuery, MOCK_LOGINS_DAILY } from './mock-data'
import { toAdminUserRow, type UserFormValues } from './usersStore'

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

  const load = useCallback(() => listUsers(page, PAGE_SIZE), [page])
  const remote = useRemoteData(load)

  const rows = useMemo(
    () => (remote.status === 'success' ? remote.data.data.map(toAdminUserRow) : []),
    [remote],
  )
  const total = remote.status === 'success' ? remote.data.meta.total : 0
  const totalPages = remote.status === 'success' ? remote.data.meta.totalPages : pageCount(total)

  const filtered = useMemo(() => rows.filter((row) => matchesUserQuery(row, query)), [rows, query])

  const active = rows.filter((r) => r.status === 'ACTIVE').length
  const inactive = rows.length - active

  async function onToggleStatus(id: string) {
    const row = rows.find((item) => item.id === id)
    if (!row) return
    try {
      await updateUser(id, { status: row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })
      toast.success('Status updated')
      await remote.refetch()
    } catch (error) {
      toastApiError(error, 'Could not update status')
    }
  }

  async function onDeactivateUser(id: string) {
    try {
      await deactivateUser(id)
      toast.success('User deactivated')
      await remote.refetch()
    } catch (error) {
      toastApiError(error, 'Could not deactivate user')
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

      <div className={STAT_GRID_CLASS}>
        <StatCard icon={Users} label="Users" value={total} />
        <StatCard icon={UserCheck} label="Active (page)" value={active} />
        <StatCard icon={UserX} label="Inactive (page)" value={inactive} />
        <StatCard
          icon={Briefcase}
          label="PMs (page)"
          value={rows.filter((r) => r.role === 'MANAGER').length}
        />
      </div>

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
          <Table startIndex={(page - 1) * PAGE_SIZE}>
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
                            void onDeactivateUser(row.id)
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
