import { useCallback, useState } from 'react'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { AsyncState } from '@/components/feedback/async-state'
import { TableSkeleton } from '@/components/feedback/skeletons'
import { PageHeader, TablePager } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DesignOffersGrid } from '@/features/design-offers/DesignOffersGrid'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { usePermissions } from '@/hooks/usePermissions'
import { useRemoteData } from '@/hooks/useRemoteData'
import { portalBaseFromPath } from '@/lib/homePath'
import { PAGE_SIZE, pageCount } from '@/lib/text'
import { cn } from '@/lib/utils'
import {
  DESIGN_REQUEST_STATUS_OPTIONS,
  designCategoryLabel,
  type DesignRequestStatus,
  designRequestStatusLabel,
  listDesignRequests,
} from '@/services/design-requests'

function isOverdue(neededBy: string, status: DesignRequestStatus): boolean {
  if (status === 'COMPLETED' || status === 'CANCELLED' || status === 'REJECTED') return false
  return new Date(neededBy).getTime() < Date.now()
}

export function DesignRequestsListPage() {
  const { t } = useTranslation(['designRequests', 'designOffers', 'common'])
  useDocumentTitle(t('designRequests:documentTitle'))
  const { isAdmin } = usePermissions()
  const location = useLocation()
  const navigate = useNavigate()
  const portal = portalBaseFromPath(location.pathname)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<DesignRequestStatus | 'ALL'>(isAdmin ? 'PENDING' : 'ALL')
  const [tab, setTab] = useState<'requests' | 'offers'>('requests')

  const load = useCallback(
    () =>
      listDesignRequests({
        page,
        limit: PAGE_SIZE,
        status: status === 'ALL' ? undefined : status,
      }),
    [page, status],
  )

  const remote = useRemoteData(load, {
    queryKey: ['design-requests', 'list', portal, page, status],
    enabled: isAdmin || tab === 'requests',
  })

  const rows = remote.status === 'success' ? remote.data.data : []
  const total = remote.status === 'success' ? remote.data.meta.total : 0

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('designRequests:title')}
        description={
          isAdmin ? t('designRequests:descriptionAdmin') : t('designRequests:descriptionPm')
        }
        actions={
          !isAdmin && tab === 'requests' ? (
            <Link
              to={`${portal}/design-requests/new`}
              className={cn(buttonVariants(), 'inline-flex items-center gap-2')}
            >
              <Plus className="size-4" />
              {t('designRequests:newRequest')}
            </Link>
          ) : null
        }
      />

      {!isAdmin ? (
        <div className="inline-flex rounded-lg border p-1" role="tablist">
          {(
            [
              ['requests', t('designRequests:tabRequests')],
              ['offers', t('designRequests:tabOffers')],
            ] as const
          ).map(([value, label]) => {
            const on = tab === value
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={on}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium',
                  on ? 'bg-foreground text-background' : 'text-muted-foreground',
                )}
                onClick={() => setTab(value)}
              >
                {label}
              </button>
            )
          })}
        </div>
      ) : null}

      {!isAdmin && tab === 'offers' ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{t('designOffers:browseHint')}</p>
          <DesignOffersGrid mode="pm" />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={status}
              onValueChange={(value) => {
                setPage(1)
                setStatus(value as DesignRequestStatus | 'ALL')
              }}
            >
              <SelectTrigger className="w-[200px]" aria-label={t('designRequests:filterStatus')}>
                <SelectValue placeholder={t('designRequests:filterStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('designRequests:allStatuses')}</SelectItem>
                {DESIGN_REQUEST_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <AsyncState
            isLoading={remote.isLoading}
            error={remote.isError ? remote.error : undefined}
            onRetry={() => void remote.refetch()}
            loadingFallback={<TableSkeleton columns={isAdmin ? 6 : 5} />}
          >
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('designRequests:empty')}</p>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('designRequests:headers.subject')}</TableHead>
                      <TableHead>{t('designRequests:headers.category')}</TableHead>
                      <TableHead>{t('designRequests:headers.status')}</TableHead>
                      <TableHead>{t('designRequests:headers.neededBy')}</TableHead>
                      <TableHead>{t('designRequests:headers.project')}</TableHead>
                      {isAdmin ? (
                        <TableHead>{t('designRequests:headers.requester')}</TableHead>
                      ) : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow
                        key={row.id}
                        className="cursor-pointer"
                        onClick={() => navigate(`${portal}/design-requests/${row.id}`)}
                      >
                        <TableCell className="font-medium">{row.subject}</TableCell>
                        <TableCell>{designCategoryLabel(row.category)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{designRequestStatusLabel(row.status)}</Badge>
                            {isOverdue(row.neededBy, row.status) ? (
                              <Badge variant="destructive">{t('designRequests:overdue')}</Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>{new Date(row.neededBy).toLocaleDateString()}</TableCell>
                        <TableCell>{row.projectName ?? '—'}</TableCell>
                        {isAdmin ? <TableCell>{row.requestedByName}</TableCell> : null}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <TablePager
              page={page}
              totalPages={pageCount(total, PAGE_SIZE)}
              total={total}
              onPageChange={setPage}
            />
          </AsyncState>
        </>
      )}
    </div>
  )
}
