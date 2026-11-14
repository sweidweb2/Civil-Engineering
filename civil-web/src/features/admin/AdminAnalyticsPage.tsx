import { useCallback } from 'react'
import {
  BadgeCheck,
  Briefcase,
  FolderKanban,
  HardHat,
  Package,
  Star,
  Store,
  Users,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AsyncState } from '@/components/feedback/async-state'
import { StatGridSkeleton } from '@/components/feedback/skeletons'
import { PageHeader, STAT_GRID_CLASS, StatCard } from '@/components/layout'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useRemoteData } from '@/hooks/useRemoteData'
import { listListings } from '@/services/listings'
import { listProjects } from '@/services/projects'
import { listProviders } from '@/services/providers'
import { listReviews } from '@/services/reviews'
import { listUsers, listVerifications } from '@/services/users'

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
  const { t } = useTranslation('admin')
  useDocumentTitle(t('dashboard.title'))
  const load = useCallback(() => loadDashboard(), [])
  const remote = useRemoteData(load, { queryKey: ['admin', 'analytics'] })
  const stats = remote.status === 'success' ? remote.data : null

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        className="mb-0"
        title={t('dashboard.title')}
        description={t('dashboard.description')}
      />

      <AsyncState
        isLoading={remote.isLoading}
        error={remote.isError ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
        loadingFallback={<StatGridSkeleton count={8} />}
      >
        {stats ? (
          <div className={STAT_GRID_CLASS}>
            <StatCard
              icon={Users}
              label={t('dashboard.registeredUsers')}
              value={stats.registeredUsers}
            />
            <StatCard
              icon={Briefcase}
              label={t('dashboard.projectManagers')}
              value={stats.managers}
            />
            <StatCard icon={Store} label={t('dashboard.providers')} value={stats.providers} />
            <StatCard icon={HardHat} label={t('dashboard.workers')} value={stats.workers} />
            <StatCard icon={FolderKanban} label={t('dashboard.projects')} value={stats.projects} />
            <StatCard icon={Package} label={t('dashboard.listings')} value={stats.listings} />
            <StatCard icon={Star} label={t('dashboard.reviews')} value={stats.reviews} />
            <StatCard
              icon={BadgeCheck}
              label={t('dashboard.verificationRequests')}
              value={stats.verificationRequests}
            />
          </div>
        ) : null}
      </AsyncState>

      <Card size="sm">
        <CardHeader>
          <CardTitle>{t('dashboard.notes')}</CardTitle>
          <p className="text-sm text-muted-foreground">{t('dashboard.notesBody')}</p>
        </CardHeader>
      </Card>
    </div>
  )
}
