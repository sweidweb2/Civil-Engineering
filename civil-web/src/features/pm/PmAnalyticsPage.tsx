import { PageHeader } from '@/components/layout/page-header'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

import { PmAnalyticsDashboard } from './components/PmAnalyticsDashboard'

export function PmAnalyticsPage() {
  useDocumentTitle('Analytics')

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        className="mb-0"
        title="Analytics"
        description="Progress and status across your projects."
      />

      <PmAnalyticsDashboard />
    </div>
  )
}
