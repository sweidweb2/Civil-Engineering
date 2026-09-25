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

import { PageHeader } from '@/components/layout/page-header'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

import { STAT_GRID_CLASS, StatCard } from './components/StatCard'
import { MOCK_ANALYTICS } from './mock-data'

export function AdminAnalyticsPage() {
  useDocumentTitle('Admin dashboard')
  const stats = MOCK_ANALYTICS

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        className="mb-0"
        title="Dashboard"
        description="Platform analytics. Figures are UI mock data until admin APIs land."
      />

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
