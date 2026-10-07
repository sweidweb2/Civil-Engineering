import { AlertTriangle, FileWarning } from 'lucide-react'
import { useCallback, useState } from 'react'

import { AsyncState } from '@/components/feedback/async-state'
import { TableSkeleton } from '@/components/feedback/skeletons'
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
import { type ErrorLogItem, listErrorLogs } from '@/services/logging'

const PAGE_LIMIT = 20

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export function ErrorLogsPage() {
  useDocumentTitle('Error logs')
  const [page, setPage] = useState(1)

  const load = useCallback(() => listErrorLogs(page, PAGE_LIMIT), [page])
  const remote = useRemoteData(load)

  const rows: ErrorLogItem[] = remote.status === 'success' ? remote.data.data : []
  const total = remote.status === 'success' ? remote.data.meta.total : 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT))

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        className="mb-0"
        title="Error logs"
        description="Unexpected / 5xx failures persisted for SUPER review."
      />

      <div className={STAT_GRID_CLASS}>
        <StatCard icon={AlertTriangle} label="Errors" value={total} />
        <StatCard icon={FileWarning} label="This page" value={rows.length} />
      </div>

      <AsyncState
        isLoading={remote.isLoading}
        error={remote.isError ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
        loadingFallback={<TableSkeleton columns={5} />}
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
                <TableHead>Status</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Path</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    No errors logged yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap">{formatWhen(row.createdAt)}</TableCell>
                    <TableCell>{row.status ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{row.code ?? '—'}</TableCell>
                    <TableCell className="max-w-md truncate" title={row.message}>
                      {row.message}
                    </TableCell>
                    <TableCell className="max-w-[12rem] truncate font-mono text-xs">
                      {row.method ? `${row.method} ` : ''}
                      {row.path ?? '—'}
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
