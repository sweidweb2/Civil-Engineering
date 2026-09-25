import { Ban, CheckCircle2, Clock, Plus, Store } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { AsyncState } from '@/components/feedback/async-state'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useRemoteData } from '@/hooks/useRemoteData'
import {
  listProviders,
  type Provider,
  type ProviderStatus,
  type ProviderStatusCounts,
} from '@/services/providers'

import { ToolbarCard } from './components/DataPanel'
import { ProviderFormDialog } from './components/ProviderFormDialog'
import { STAT_GRID_CLASS, StatCard } from './components/StatCard'
import { TablePager } from './components/TablePager'
import { ellipsis, PAGE_SIZE, pageCount } from './lib/text'

const EMPTY_COUNTS: ProviderStatusCounts = { PENDING: 0, APPROVED: 0, SUSPENDED: 0 }

function locationLabel(provider: Provider) {
  return [provider.city, provider.country].filter(Boolean).join(', ') || provider.address || 'No location'
}

function ProviderStatusBadge({ status }: { status: ProviderStatus }) {
  const variant = status === 'APPROVED' ? 'default' : 'outline'
  return <Badge variant={variant}>{status}</Badge>
}

export function ManageProvidersPage() {
  useDocumentTitle('Manage providers')
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim())
      setPage(1)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [query])

  const load = useCallback(
    () => listProviders(page, PAGE_SIZE, debouncedQuery || undefined),
    [debouncedQuery, page],
  )
  const remote = useRemoteData(load)

  const providers = remote.status === 'success' ? remote.data.data : []
  const total = remote.status === 'success' ? remote.data.meta.total : 0
  const counts = remote.status === 'success' ? remote.data.meta.statusCounts : EMPTY_COUNTS
  const totalPages = pageCount(total)

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        className="mb-0"
        title="Manage providers"
        description="One company per provider owner. Invisible until an admin approves."
        actions={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus />
            Create
          </Button>
        }
      />

      <div className={STAT_GRID_CLASS}>
        <StatCard icon={Store} label="Providers" value={total} />
        <StatCard icon={CheckCircle2} label="Approved" value={counts.APPROVED} />
        <StatCard icon={Clock} label="Pending" value={counts.PENDING} />
        <StatCard icon={Ban} label="Suspended" value={counts.SUSPENDED} />
      </div>

      <ToolbarCard>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter providers…"
          aria-label="Filter providers"
          className="max-w-sm"
        />
      </ToolbarCard>

      <AsyncState
        isLoading={remote.isLoading}
        error={remote.isError ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
      >
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {providers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No providers match.</p>
          ) : (
            providers.map((provider) => (
              <Link key={provider.id} to={`/admin/providers/${provider.id}`} className="min-w-0">
                <Card size="sm" className="h-full cursor-pointer transition-colors hover:bg-muted/40 hover:ring-primary/30">
                  <CardHeader className="min-w-0">
                    <div className="mb-1 flex h-16 items-end overflow-hidden rounded-lg bg-muted px-3 py-2">
                      {provider.logoUrl ? (
                        <img
                          src={provider.logoUrl}
                          alt=""
                          className="h-full w-full object-contain object-left"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">Provider</span>
                      )}
                    </div>
                    <CardTitle className="truncate" title={provider.name}>
                      {ellipsis(provider.name, 36)}
                    </CardTitle>
                    <CardDescription className="truncate" title={locationLabel(provider)}>
                      {ellipsis(locationLabel(provider), 32)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex min-w-0 flex-wrap items-center gap-2">
                    <ProviderStatusBadge status={provider.status} />
                    <span className="truncate text-xs text-muted-foreground">
                      {ellipsis(provider.owner.displayName || provider.owner.email, 24)}
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
