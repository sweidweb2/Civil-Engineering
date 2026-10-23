import { useCallback } from 'react'
import { BadgeCheck, Briefcase,FolderKanban, HardHat, Package, Star, Store, Users } from 'lucide-react'

import { AsyncState } from '@/components/feedback/async-state'
import { StatGridSkeleton } from '@/components/feedback/skeletons'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useRemoteData } from '@/hooks/useRemoteData'
import { listListings } from '@/services/listings'
import { listProjects } from '@/services/projects'
import { listProviders } from '@/services/providers'
import { listReviews } from '@/services/reviews'
import { listUsers, listVerifications } from '@/services/users'

import { STAT_GRID_CLASS, StatCard } from './components/StatCard'

type DashboardStats = {
  registeredUsers: number
  managers: number
  providers: number
  workers: number
  projects: number
  listings: number
  reviews: number
  verificationRequests: number
}

async function loadDashboard(): Promise<DashboardStats> {
  const [users, providers, projects, listings, reviews, verifications] = await Promise.all([
    listUsers(1, 1),
    listProviders(1, 1),
    listProjects(1, 1),
    listListings(1, 1),
    listReviews(1, 1),
    listVerifications({ page: 1, limit: 1 }),
  ])
  const providerCounts = providers.meta.statusCounts
  const reviewCounts = reviews.meta.statusCounts
  return {
    registeredUsers: users.meta.total,
    managers: users.meta.counts.managers,
    providers: providerCounts.PENDING + providerCounts.APPROVED + providerCounts.SUSPENDED,
    workers: verifications.meta.counts.workers,
    projects: projects.meta.total,
    listings: listings.meta.total,
    reviews: reviewCounts.PENDING + reviewCounts.ACCEPTED + reviewCounts.REJECTED,
    verificationRequests: verifications.meta.counts.requested,
  }
}

export function AdminAnalyticsPage() {
  useDocumentTitle('Dashboard')
  const load = useCallback(() => loadDashboard(), [])
  const remote = useRemoteData(load, { queryKey: ['admin', 'analytics'] })
  const stats = remote.status === 'success' ? remote.data : null

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        className="mb-0"
        title="Dashboard"
        description="Live counts from users, providers, projects, listings, reviews, and verification."
      />

      <AsyncState
        isLoading={remote.isLoading}
        error={remote.isError ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
        loadingFallback={<StatGridSkeleton count={8} />}
      >
        {stats ? (
          <div className={STAT_GRID_CLASS}>
            <StatCard icon={Users} label="Registered users" value={stats.registeredUsers} />
            <StatCard icon={Briefcase} label="Project managers" value={stats.managers} />
            <StatCard icon={Store} label="Providers" value={stats.providers} />
            <StatCard icon={HardHat} label="Workers" value={stats.workers} />
            <StatCard icon={FolderKanban} label="Projects" value={stats.projects} />
            <StatCard icon={Package} label="Listings" value={stats.listings} />
            <StatCard icon={Star} label="Reviews" value={stats.reviews} />
            <StatCard icon={BadgeCheck} label="Verification requests" value={stats.verificationRequests} />
          </div>
        ) : null}
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
