import { useCallback, useState } from 'react'
import { AlertTriangle, FileWarning } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AsyncState } from '@/components/feedback/async-state'
import { TableSkeleton } from '@/components/feedback/skeletons'
import { DataPanel, PageHeader, STAT_GRID_CLASS, StatCard, TablePager } from '@/components/layout'
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
import { formatDateTimeInAppLocale } from '@/lib/locale'
import { type ErrorLogItem, listErrorLogs } from '@/services/logging'

const PAGE_LIMIT = 20

function formatWhen(iso: string) {
  try {
    return formatDateTimeInAppLocale(iso)
  } catch {
    return iso
  }
}

export function ErrorLogsPage() {
  const { t } = useTranslation('admin')
  useDocumentTitle(t('logs.errors.title'))
  const [page, setPage] = useState(1)

  const load = useCallback(() => listErrorLogs(page, PAGE_LIMIT), [page])
  const remote = useRemoteData(load, { queryKey: ['logs', 'errors', page] })

  const rows: ErrorLogItem[] = remote.status === 'success' ? remote.data.data : []
  const total = remote.status === 'success' ? remote.data.meta.total : 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT))

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        className="mb-0"
        title={t('logs.errors.title')}
        description={t('logs.errors.description')}
      />

      <div className={STAT_GRID_CLASS}>
        <StatCard icon={AlertTriangle} label={t('logs.errors.errors')} value={total} />
        <StatCard icon={FileWarning} label={t('logs.thisPage')} value={rows.length} />
      </div>

      <AsyncState
        isLoading={remote.isLoading}
        error={remote.isError ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
        loadingFallback={<TableSkeleton columns={6} />}
      >
        <DataPanel
          footer={
            <TablePager page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
          }
        >
          <Table startIndex={(page - 1) * PAGE_LIMIT}>
            <TableHeader>
              <TableRow>
                <TableHead>{t('logs.when')}</TableHead>
                <TableHead>{t('logs.errors.status')}</TableHead>
                <TableHead>{t('logs.errors.code')}</TableHead>
                <TableHead>{t('logs.errors.requestId')}</TableHead>
                <TableHead>{t('logs.errors.message')}</TableHead>
                <TableHead>{t('logs.errors.path')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    {t('logs.errors.empty')}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap">{formatWhen(row.createdAt)}</TableCell>
                    <TableCell>{row.status ?? '—'}</TableCell>
                    <TableCell className="font-mono text-sm">{row.code ?? '—'}</TableCell>
                    <TableCell
                      className="max-w-[10rem] truncate font-mono text-sm"
                      title={row.requestId ?? undefined}
                    >
                      {row.requestId ?? '—'}
                    </TableCell>
                    <TableCell className="max-w-md truncate" title={row.message}>
                      {row.message}
                    </TableCell>
                    <TableCell className="max-w-[12rem] truncate font-mono text-sm">
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
