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
import { type AdminOverview, getAdminOverview } from '@/services/users'

async function loadDashboard(): Promise<AdminOverview> {
  const { data } = await getAdminOverview()
  return data
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
            <StatCard icon={Users} label={t('dashboard.registeredUsers')} value={stats.users} />
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
