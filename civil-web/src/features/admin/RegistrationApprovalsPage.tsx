import { Clock, Store, UserCheck, UserPlus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { AsyncState } from '@/components/feedback/async-state'
import { TableSkeleton } from '@/components/feedback/skeletons'
import { PageHeader } from '@/components/layout/page-header'
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
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { loadMock } from '@/hooks/loadMock'
import { useRemoteData } from '@/hooks/useRemoteData'

import type { ApprovalStatus, RegistrationRow } from './admin.types'
import { DataPanel, ToolbarCard } from './components/DataPanel'
import { STAT_GRID_CLASS, StatCard } from './components/StatCard'
import { TablePager } from './components/TablePager'
import { UserAttributeCells, USER_TABLE_HEADERS } from './components/UserCells'
import { PAGE_SIZE, pageCount, paginate } from './lib/text'
import { matchesUserQuery, MOCK_REGISTRATIONS } from './mock-data'

const TABS: Array<{ value: ApprovalStatus; label: string }> = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
]

export function RegistrationApprovalsPage() {
  useDocumentTitle('Registration approvals')
  const load = useCallback(() => loadMock(MOCK_REGISTRATIONS), [])
  const remote = useRemoteData(load)
  const seed = remote.status === 'success' ? remote.data : null
  const [rows, setRows] = useState<RegistrationRow[]>([])
  useEffect(() => {
    if (seed) setRows(seed)
  }, [seed])
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [tab, setTab] = useState<ApprovalStatus>('pending')

  const pendingRows = useMemo(() => rows.filter((r) => r.approval === 'pending'), [rows])
  const approvedRows = useMemo(() => rows.filter((r) => r.approval === 'approved'), [rows])
  const scoped = tab === 'pending' ? pendingRows : approvedRows
  const filtered = useMemo(() => scoped.filter((row) => matchesUserQuery(row, query)), [query, scoped])
  const totalPages = pageCount(filtered.length)
  const safePage = Math.min(page, totalPages)
  const visible = paginate(filtered, safePage)

  function setApproval(id: string, approval: ApprovalStatus) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, approval } : row)))
    toast.message(approval === 'approved' ? 'Marked approved (UI only)' : 'Moved to pending (UI only)')
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        className="mb-0"
        title="Registration approvals"
        description="PM, provider, and worker registrations. Guests browse without an account."
      />

      <div className={STAT_GRID_CLASS}>
        <StatCard icon={UserPlus} label="Total registrations" value={rows.length} />
        <StatCard icon={Clock} label="Pending" value={pendingRows.length} />
        <StatCard icon={UserCheck} label="Approved" value={approvedRows.length} />
        <StatCard
          icon={Store}
          label="Providers in queue"
          value={pendingRows.filter((r) => r.role === 'PROVIDER').length}
        />
      </div>

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
            {TABS.map((item) => (
              <TabsTrigger key={item.value} value={item.value}>
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <Input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(1)
            }}
            placeholder="Filter registrations…"
            aria-label="Filter registrations"
            className="max-w-sm"
          />
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
                      {tab === 'pending' ? 'No pending registrations.' : 'No approved registrations.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  visible.map((row) => (
                    <TableRow key={row.id}>
                      <UserAttributeCells row={row} />
                      <TableCell className="text-right">
                        {tab === 'pending' ? (
                          <Button type="button" size="sm" onClick={() => setApproval(row.id, 'approved')}>
                            Approve
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setApproval(row.id, 'pending')}
                          >
                            Unapprove
                          </Button>
                        )}
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
