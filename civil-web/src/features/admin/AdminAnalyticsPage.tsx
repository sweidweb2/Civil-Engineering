import {
  BadgeCheck,
  Briefcase,
  Eye,
  Flag,
  FolderKanban,
  HardHat,
  Library,
  Package,
  Store,
  Users,
} from 'lucide-react'
import { useCallback } from 'react'

import { AsyncState } from '@/components/feedback/async-state'
import { StatGridSkeleton } from '@/components/feedback/skeletons'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { loadMock } from '@/hooks/loadMock'
import { useRemoteData } from '@/hooks/useRemoteData'

import { STAT_GRID_CLASS, StatCard } from './components/StatCard'
import { MOCK_ANALYTICS } from './mock-data'

export function AdminAnalyticsPage() {
  useDocumentTitle('Dashboard')
  const load = useCallback(() => loadMock(MOCK_ANALYTICS), [])
  const remote = useRemoteData(load)
  const stats = remote.status === 'success' ? remote.data : MOCK_ANALYTICS

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        className="mb-0"
        title="Dashboard"
        description="Platform analytics. Figures are UI mock data until admin APIs land."
      />

      <AsyncState
        isLoading={remote.isLoading}
        error={remote.isError ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
        loadingFallback={<StatGridSkeleton count={10} />}
      >
        <div className={STAT_GRID_CLASS}>
          <StatCard icon={Users} label="Registered users" value={stats.registeredUsers} />
          <StatCard icon={Briefcase} label="Active PMs" value={stats.activePms} />
          <StatCard icon={Store} label="Providers" value={stats.providers} />
          <StatCard icon={HardHat} label="Workers" value={stats.workers} />
          <StatCard icon={FolderKanban} label="Projects" value={stats.projects} />
          <StatCard icon={Package} label="Marketplace listings" value={stats.marketplaceListings} />
          <StatCard icon={Eye} label="Listing views" value={stats.listingViews.toLocaleString()} />
          <StatCard icon={Library} label="Directory views" value={stats.directoryViews.toLocaleString()} />
          <StatCard icon={Flag} label="Reports" value={stats.reports} />
          <StatCard icon={BadgeCheck} label="Verification requests" value={stats.verificationRequests} />
        </div>
      </AsyncState>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Notes</CardTitle>
          <p className="text-sm text-muted-foreground">
            Revenue and subscription metrics are out of scope. Marketplace stays directory-only.
          </p>
        </CardHeader>
      </Card>
    </div>
  )
}
