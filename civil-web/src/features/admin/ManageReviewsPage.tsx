import { CheckCircle2, Clock, Star, XCircle } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { AsyncState } from '@/components/feedback/async-state'
import { TableSkeleton } from '@/components/feedback/skeletons'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
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

import type { PlatformReview, ReviewStatus } from './admin.types'
import { DataPanel, RowActions, ToolbarCard } from './components/DataPanel'
import { STAT_GRID_CLASS, StatCard } from './components/StatCard'
import { TablePager } from './components/TablePager'
import { ellipsis, PAGE_SIZE, pageCount, paginate } from './lib/text'
import { MOCK_REVIEWS } from './mock-data'

const TABS: Array<{ value: ReviewStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
]

function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  return <Badge variant={status === 'accepted' ? 'default' : 'outline'}>{status}</Badge>
}

function matchesReview(row: PlatformReview, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [row.authorName, row.authorEmail, row.targetName, row.targetType, row.comment, row.status]
    .join(' ')
    .toLowerCase()
    .includes(q)
}

export function ManageReviewsPage() {
  useDocumentTitle('Manage reviews')
  const load = useCallback(() => loadMock(MOCK_REVIEWS), [])
  const remote = useRemoteData(load)
  const seed = remote.status === 'success' ? remote.data : null
  const [rows, setRows] = useState<PlatformReview[]>([])
  useEffect(() => {
    if (seed) setRows(seed)
  }, [seed])
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [tab, setTab] = useState<ReviewStatus | 'all'>('all')

  const scoped = useMemo(
    () => rows.filter((row) => (tab === 'all' ? true : row.status === tab)),
    [rows, tab],
  )
  const filtered = useMemo(() => scoped.filter((row) => matchesReview(row, query)), [scoped, query])
  const totalPages = pageCount(filtered.length)
  const safePage = Math.min(page, totalPages)
  const visible = paginate(filtered, safePage)

  function setStatus(id: string, status: ReviewStatus) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, status } : row)))
    toast.message(
      status === 'accepted'
        ? 'Review accepted (UI only)'
        : status === 'rejected'
          ? 'Review rejected (UI only)'
          : 'Review moved to pending (UI only)',
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        className="mb-0"
        title="Manage reviews"
        description="Directory reviews and ratings. Accept to publish, reject to hide."
      />

      <div className={STAT_GRID_CLASS}>
        <StatCard icon={Star} label="Reviews" value={rows.length} />
        <StatCard icon={Clock} label="Pending" value={rows.filter((r) => r.status === 'pending').length} />
        <StatCard icon={CheckCircle2} label="Accepted" value={rows.filter((r) => r.status === 'accepted').length} />
        <StatCard icon={XCircle} label="Rejected" value={rows.filter((r) => r.status === 'rejected').length} />
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => {
          if (value === 'all' || value === 'pending' || value === 'accepted' || value === 'rejected') {
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
            placeholder="Filter reviews…"
            aria-label="Filter reviews"
            className="max-w-sm"
          />
        </ToolbarCard>

        <TabsContent value={tab}>
          <AsyncState
            isLoading={remote.isLoading}
            error={remote.isError ? remote.error : undefined}
            onRetry={() => void remote.refetch()}
            loadingFallback={<TableSkeleton columns={6} />}
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
                  <TableHead>Author</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Comment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground">
                      No reviews match.
                    </TableCell>
                  </TableRow>
                ) : (
                  visible.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="max-w-40" title={row.authorEmail}>
                        <div className="min-w-0">
                          <p className="truncate">{ellipsis(row.authorName, 22)}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {ellipsis(row.authorEmail, 24)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-40">
                        <div className="min-w-0">
                          <p className="truncate" title={row.targetName}>
                            {ellipsis(row.targetName, 22)}
                          </p>
                          <Badge variant="outline">{row.targetType}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="tabular-nums">{row.rating}/5</TableCell>
                      <TableCell className="max-w-56 truncate" title={row.comment}>
                        {ellipsis(row.comment, 40)}
                      </TableCell>
                      <TableCell>
                        <ReviewStatusBadge status={row.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <RowActions>
                          {row.status !== 'accepted' ? (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => setStatus(row.id, 'accepted')}
                            >
                              Accept
                            </Button>
                          ) : null}
                          {row.status !== 'rejected' ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setStatus(row.id, 'rejected')}
                            >
                              Reject
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
