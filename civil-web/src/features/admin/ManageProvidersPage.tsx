import { useTranslation } from 'react-i18next'
import { useCallback, useEffect, useState } from 'react'
import { Ban, CheckCircle2, Clock, Plus, Store } from 'lucide-react'
import { Link } from 'react-router-dom'

import { AsyncState } from '@/components/feedback/async-state'
import { CardGridSkeleton, ProviderCardMedia } from '@/components/feedback/skeletons'
import { PageHeader, TablePager, ToolbarCard } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { usePagedQuery } from '@/hooks/usePagedQuery'
import { useRemoteData } from '@/hooks/useRemoteData'
import {
  listProviders,
  type Provider,
  type ProviderStatus,
  type ProviderStatusCounts,
} from '@/services/providers'

import { ProviderFormDialog } from './components/ProviderFormDialog'
import { STAT_GRID_CLASS, StatCard } from './components/StatCard'
import { ellipsis, PAGE_SIZE, pageCount } from './lib/text'

const EMPTY_COUNTS: ProviderStatusCounts = { PENDING: 0, APPROVED: 0, SUSPENDED: 0 }

function locationLabel(provider: Provider, fallback = '') {
  return (
    [provider.city, provider.country].filter(Boolean).join(', ') || provider.address || fallback
  )
}

function ProviderStatusBadge({ status }: { status: ProviderStatus }) {
  const { t } = useTranslation('admin')
  const variant = status === 'APPROVED' ? 'default' : 'outline'
  return <Badge variant={variant}>{t(`providerStatus.${status}`)}</Badge>
}

function ProviderCardCover({ logoUrl, variant }: { logoUrl: string | null; variant: number }) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [logoUrl])

  if (!logoUrl || failed) {
    return <ProviderCardMedia variant={variant} />
  }

  return (
    <div className="relative aspect-[2/1] w-full shrink-0 overflow-hidden bg-muted">
      <img
        src={logoUrl}
        alt=""
        decoding="async"
        className="absolute inset-0 size-full object-cover object-center"
        onError={() => setFailed(true)}
      />
    </div>
  )
}

export function ManageProvidersPage() {
  const { t } = useTranslation(['admin', 'common'])
  useDocumentTitle(t('admin:providers.documentTitle'))
  const { query, setQuery, debouncedQuery, page, setPage } = usePagedQuery()
  const [createOpen, setCreateOpen] = useState(false)

  const load = useCallback(
    () => listProviders(page, PAGE_SIZE, debouncedQuery || undefined),
    [debouncedQuery, page],
  )
  const remote = useRemoteData(load, { queryKey: ['providers', 'list', page, debouncedQuery] })

  const providers = remote.status === 'success' ? remote.data.data : []
  const total = remote.status === 'success' ? remote.data.meta.total : 0
  const counts = remote.status === 'success' ? remote.data.meta.statusCounts : EMPTY_COUNTS
  const totalPages = pageCount(total)

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        className="mb-0"
        title={t('admin:providers.title')}
        description={t('admin:providers.description')}
        actions={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus />
            {t('admin:providers.create')}
          </Button>
        }
      />

      <div className={STAT_GRID_CLASS}>
        <StatCard icon={Store} label={t('admin:providers.metricProviders')} value={total} />
        <StatCard
          icon={CheckCircle2}
          label={t('admin:providers.metricApproved')}
          value={counts.APPROVED}
        />
        <StatCard icon={Clock} label={t('admin:providers.metricPending')} value={counts.PENDING} />
        <StatCard
          icon={Ban}
          label={t('admin:providers.metricSuspended')}
          value={counts.SUSPENDED}
        />
      </div>

      <ToolbarCard>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('admin:providers.filterPlaceholder')}
          aria-label={t('admin:providers.filterAria')}
          className="max-w-sm"
        />
      </ToolbarCard>

      <AsyncState
        isLoading={remote.isLoading}
        error={remote.isError ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
        loadingFallback={<CardGridSkeleton media="provider" />}
      >
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {providers.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('admin:providers.noMatch')}</p>
          ) : (
            providers.map((provider, index) => (
              <Link key={provider.id} to={`/admin/providers/${provider.id}`} className="min-w-0">
                <Card
                  size="sm"
                  className="h-full cursor-pointer gap-2 overflow-hidden py-0! transition-colors hover:bg-muted/40 hover:ring-primary/30"
                >
                  <ProviderCardCover logoUrl={provider.logoUrl} variant={index} />
                  <CardHeader className="min-w-0 px-3 pt-0 pb-0">
                    <CardTitle className="truncate text-sm" title={provider.name}>
                      {ellipsis(provider.name, 36)}
                    </CardTitle>
                    <CardDescription
                      className="truncate text-xs"
                      title={locationLabel(provider, t('admin:providers.noLocation'))}
                    >
                      {ellipsis(locationLabel(provider, t('admin:providers.noLocation')), 32)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex min-w-0 flex-wrap items-center gap-2 px-3 pt-0 pb-3">
                    <ProviderStatusBadge status={provider.status} />
                    <span className="truncate text-xs text-muted-foreground">
                      {ellipsis(
                        provider.owner?.displayName ||
                          provider.owner?.email ||
                          t('admin:providers.form.noOwner'),
                        24,
                      )}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
        <TablePager page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      </AsyncState>

      <ProviderFormDialog
        open={createOpen}
        mode="create"
        onOpenChange={setCreateOpen}
        onSaved={() => {
          setPage(1)
          void remote.refetch()
        }}
      />
    </div>
  )
}
