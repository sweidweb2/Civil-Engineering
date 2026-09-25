import { Activity, FileText } from 'lucide-react'
import { useCallback, useState } from 'react'

import { AsyncState } from '@/components/feedback/async-state'
import { DataPanel } from '@/components/layout/data-panel'
import { PageHeader } from '@/components/layout/page-header'
import { STAT_GRID_CLASS, StatCard } from '@/components/layout/stat-card'
import { TablePager } from '@/components/layout/table-pager'
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
import { type ActivityLogItem, listActivityLogs } from '@/services/logging'

const PAGE_LIMIT = 20

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export function ActivityLogsPage() {
  useDocumentTitle('Activity logs')
  const [page, setPage] = useState(1)

  const load = useCallback(() => listActivityLogs(page, PAGE_LIMIT), [page])
  const remote = useRemoteData(load)

  const rows: ActivityLogItem[] = remote.status === 'success' ? remote.data.data : []
  const total = remote.status === 'success' ? remote.data.meta.total : 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT))

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        className="mb-0"
        title="Activity logs"
        description="Business audit events (SUPER only)."
      />

      <div className={STAT_GRID_CLASS}>
        <StatCard icon={Activity} label="Events" value={total} />
        <StatCard icon={FileText} label="This page" value={rows.length} />
      </div>

      <AsyncState
        isLoading={remote.isLoading}
        error={remote.isError ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
      >
        <DataPanel
          footer={
            <TablePager page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
          }
        >
          <Table startIndex={(page - 1) * PAGE_LIMIT}>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Request</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    No activity yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap">{formatWhen(row.createdAt)}</TableCell>
                    <TableCell className="max-w-40 truncate font-medium">{row.action}</TableCell>
                    <TableCell className="max-w-48 truncate">
                      {row.user?.email ?? row.userId ?? '—'}
                    </TableCell>
                    <TableCell className="max-w-40 truncate">
                      {row.entity
                        ? `${row.entity}${row.entityId ? `:${row.entityId.slice(0, 8)}` : ''}`
                        : '—'}
                    </TableCell>
                    <TableCell className="max-w-[8rem] truncate font-mono text-xs">
                      {row.requestId ?? '—'}
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
