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
import { loadMock } from '@/hooks/loadMock'
import { useRemoteData } from '@/hooks/useRemoteData'
import { portalBaseFromPath } from '@/lib/homePath'
import { cn } from '@/lib/utils'

import { DataPanel, RowActions } from './components/DataPanel'
import { UserFormDialog } from './components/UserFormDialog'
import { LoginLineChart } from './components/LoginLineChart'
import { RoleBarChart } from './components/RoleBarChart'
import { STAT_GRID_CLASS, StatCard } from './components/StatCard'
import { TablePager } from './components/TablePager'
import { UserAttributeCells, USER_TABLE_HEADERS } from './components/UserCells'
import { PAGE_SIZE, pageCount, paginate } from './lib/text'
import { readUsersPageLayout, writeUsersPageLayout } from './lib/users-layout'
import { matchesUserQuery, MOCK_LOGINS_DAILY } from './mock-data'
import { useUsersStore } from './usersStore'

export function UsersPage() {
  useDocumentTitle('Users')
  const location = useLocation()
  const navigate = useNavigate()
  const usersPath = `${portalBaseFromPath(location.pathname)}/users`
  const load = useCallback(() => loadMock(true), [])
  const remote = useRemoteData(load)
  const rows = useUsersStore((state) => state.items)
  const createUser = useUsersStore((state) => state.createUser)
  const removeUser = useUsersStore((state) => state.removeUser)
  const toggleStatus = useUsersStore((state) => state.toggleStatus)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [chartsOpen, setChartsOpen] = useState(true)
  const [showUsage, setShowUsage] = useState(() => readUsersPageLayout().showUsage)
  const [layoutOpen, setLayoutOpen] = useState(false)
  const [draftShowUsage, setDraftShowUsage] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)

  const filtered = useMemo(() => rows.filter((row) => matchesUserQuery(row, query)), [rows, query])
  const totalPages = pageCount(filtered.length)
  const safePage = Math.min(page, totalPages)
  const visible = paginate(filtered, safePage)

  const active = rows.filter((r) => r.status === 'ACTIVE').length
  const inactive = rows.length - active

  function onToggleStatus(id: string) {
    toggleStatus(id)
    toast.message('Status updated (UI only)')
  }

  function onRemoveUser(id: string) {
    removeUser(id)
    toast.message('User removed from this list (UI only)')
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        className="mb-0"
        title="Manage users"
        description="User + profile fields. passwordHash is never shown."
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
        <StatCard icon={Users} label="Users" value={rows.length} />
        <StatCard icon={UserCheck} label="Active" value={active} />
        <StatCard icon={UserX} label="Inactive" value={inactive} />
        <StatCard icon={Briefcase} label="PMs" value={rows.filter((r) => r.role === 'MANAGER').length} />
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
                <p className="text-sm text-muted-foreground">Logins and role mix. Mock counts only.</p>
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
        onSave={(values) => {
          const error = createUser(values)
          if (!error) setPage(1)
          return error
        }}
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
                setPage(1)
              }}
              placeholder="Filter users…"
              aria-label="Filter users"
              className="max-w-sm"
            />
          }
          footer={
            <TablePager
              page={safePage}
              totalPages={totalPages}
              total={filtered.length}
              onPageChange={setPage}
            />
          }
        >
          <Table startIndex={(safePage - 1) * PAGE_SIZE}>
          <TableHeader>
            <TableRow>
              {USER_TABLE_HEADERS.map((header) => (
                <TableHead key={header}>{header}</TableHead>
              ))}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={USER_TABLE_HEADERS.length + 1} className="text-muted-foreground">
                  No users match.
                </TableCell>
              </TableRow>
            ) : (
              visible.map((row) => (
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
                  <UserAttributeCells row={row} onToggleStatus={onToggleStatus} />
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
                        aria-label={`Delete ${row.email}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          onRemoveUser(row.id)
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
