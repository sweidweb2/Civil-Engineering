import { useCallback, useState } from 'react'
import { Activity, FileText } from 'lucide-react'
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
import { type ActivityLogItem, listActivityLogs } from '@/services/logging'

const PAGE_LIMIT = 20

function formatWhen(iso: string) {
  try {
    return formatDateTimeInAppLocale(iso)
  } catch {
    return iso
  }
}

export function ActivityLogsPage() {
  const { t } = useTranslation('admin')
  useDocumentTitle(t('logs.activity.title'))
  const [page, setPage] = useState(1)

  const load = useCallback(() => listActivityLogs(page, PAGE_LIMIT), [page])
  const remote = useRemoteData(load, { queryKey: ['logs', 'activity', page] })

  const rows: ActivityLogItem[] = remote.status === 'success' ? remote.data.data : []
  const total = remote.status === 'success' ? remote.data.meta.total : 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT))

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        className="mb-0"
        title={t('logs.activity.title')}
        description={t('logs.activity.description')}
      />

      <div className={STAT_GRID_CLASS}>
        <StatCard icon={Activity} label={t('logs.activity.events')} value={total} />
        <StatCard icon={FileText} label={t('logs.thisPage')} value={rows.length} />
      </div>

      <AsyncState
        isLoading={remote.isLoading}
        error={remote.isError ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
        loadingFallback={<TableSkeleton columns={4} />}
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
                <TableHead>{t('logs.activity.action')}</TableHead>
                <TableHead>{t('logs.activity.user')}</TableHead>
                <TableHead>{t('logs.activity.entity')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    {t('logs.activity.empty')}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap">{formatWhen(row.createdAt)}</TableCell>
                    <TableCell className="max-w-40 truncate font-medium">{row.action}</TableCell>
                    <TableCell className="max-w-48 truncate">{row.user?.email ?? '—'}</TableCell>
                    <TableCell className="max-w-40 truncate">{row.entity ?? '—'}</TableCell>
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
